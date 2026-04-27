using System.Data.Common;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Common.Behaviors;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class CloseBudgetMonthCommandHandlerTests
{
    private readonly MariaDbFixture _db;

    public CloseBudgetMonthCommandHandlerTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task ClosesOpenMonth_AndWritesSnapshotTotals()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();

        var closedMonth = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        closedMonth.Should().NotBeNull();
        closedMonth!.Status.Should().Be(BudgetMonthStatuses.Closed);
        closedMonth.ClosedAt.Should().Be(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc));
        closedMonth.SnapshotTotalIncomeMonthly.Should().Be(32500m);
        closedMonth.SnapshotTotalExpensesMonthly.Should().Be(12000m);
        closedMonth.SnapshotTotalSavingsMonthly.Should().Be(2500m);
        closedMonth.SnapshotTotalDebtPaymentsMonthly.Should().BeGreaterThan(0m);
        closedMonth.SnapshotFinalBalanceMonthly.Should().Be(
            closedMonth.SnapshotTotalIncomeMonthly
            - closedMonth.SnapshotTotalExpensesMonthly
            - closedMonth.SnapshotTotalSavingsMonthly
            - closedMonth.SnapshotTotalDebtPaymentsMonthly);

        result.Value!.SnapshotTotals.TotalIncomeMonthly.Should().Be(closedMonth.SnapshotTotalIncomeMonthly!.Value);
        result.Value.SnapshotTotals.TotalExpensesMonthly.Should().Be(closedMonth.SnapshotTotalExpensesMonthly!.Value);
        result.Value.SnapshotTotals.TotalSavingsMonthly.Should().Be(closedMonth.SnapshotTotalSavingsMonthly!.Value);
        result.Value.SnapshotTotals.TotalDebtPaymentsMonthly.Should().Be(closedMonth.SnapshotTotalDebtPaymentsMonthly!.Value);
        result.Value.SnapshotTotals.FinalBalanceMonthly.Should().Be(closedMonth.SnapshotFinalBalanceMonthly!.Value);
    }

    [Fact]
    public async Task RejectsInvalidYearMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Handler.Handle(
            new CloseBudgetMonthCommand(
                seed.Persoid,
                seed.UserId,
                "2026-4",
                new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.InvalidYearMonth.Code);
    }

    [Fact]
    public async Task RejectsWhenMonthDoesNotExist()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Handler.Handle(
            new CloseBudgetMonthCommand(
                seed.Persoid,
                seed.UserId,
                "2026-04",
                new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.MonthNotFound.Code);
    }

    [Fact]
    public async Task RejectsWhenMonthIsNotOpen()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            status: BudgetMonthStatuses.Closed,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 04, 30, 9, 0, 0, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Handler.Handle(
            new CloseBudgetMonthCommand(
                seed.Persoid,
                seed.UserId,
                "2026-04",
                new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task RejectsWhenMonthIsSkipped()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Handler.Handle(
            new CloseBudgetMonthCommand(
                seed.Persoid,
                seed.UserId,
                "2026-04",
                new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.MonthMustBeOpenToClose.Code);

        var month = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        month.Should().NotBeNull();
        month!.Status.Should().Be(BudgetMonthStatuses.Skipped);
        month.ClosedAt.Should().BeNull();
        month.SnapshotTotalIncomeMonthly.Should().BeNull();
        month.SnapshotTotalExpensesMonthly.Should().BeNull();
        month.SnapshotTotalSavingsMonthly.Should().BeNull();
        month.SnapshotTotalDebtPaymentsMonthly.Should().BeNull();
        month.SnapshotFinalBalanceMonthly.Should().BeNull();
    }

    [Fact]
    public async Task RejectsWhenCloseWindowIsNotOpen()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 20, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.MonthNotEligibleToClose.Code);

        var month = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        month!.Status.Should().Be(BudgetMonthStatuses.Open);
    }

    [Fact]
    public async Task EnsuresNextMonthExists_WhenClosingSucceeds()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth.Should().NotBeNull();
        nextMonth!.Status.Should().Be(BudgetMonthStatuses.Open);
    }

    [Fact]
    public async Task AppliesCarryOverModeNone_ToNextMonth()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth!.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.None);
        nextMonth.CarryOverAmount.Should().BeNull();
    }

    [Fact]
    public async Task AppliesCarryOverModeFull_ToNextMonth()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth!.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Full);
        nextMonth.CarryOverAmount.Should().BeNull();
    }

    [Fact]
    public async Task WorksWhenNextMonthAlreadyExists()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-05",
            status: BudgetMonthStatuses.Open,
            openedAtUtc: new DateTime(2026, 05, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.Custom,
            carryOverAmount: 1234m);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-05")).Should().Be(1);

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth!.Status.Should().Be(BudgetMonthStatuses.Open);
        nextMonth.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Full);
        nextMonth.CarryOverAmount.Should().BeNull();
    }

    [Fact]
    public async Task RejectsAndRollsBack_WhenNextMonthAlreadyExistsButIsClosed()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-05",
            status: BudgetMonthStatuses.Closed,
            openedAtUtc: new DateTime(2026, 05, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 05, 31, 9, 0, 0, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));
        var behavior = new UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>(
            sut.Uow,
            NullLogger<UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>>.Instance);

        var command = new CloseBudgetMonthCommand(
            seed.Persoid,
            seed.UserId,
            "2026-04",
            new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full));

        var result = await behavior.Handle(
            command,
            () => sut.Handler.Handle(command, CancellationToken.None),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.NextMonthMustBeOpen.Code);

        var currentMonth = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        currentMonth.Should().NotBeNull();
        currentMonth!.Status.Should().Be(BudgetMonthStatuses.Open);
        currentMonth.ClosedAt.Should().BeNull();
        currentMonth.SnapshotTotalIncomeMonthly.Should().BeNull();
        currentMonth.SnapshotTotalExpensesMonthly.Should().BeNull();
        currentMonth.SnapshotTotalSavingsMonthly.Should().BeNull();
        currentMonth.SnapshotTotalDebtPaymentsMonthly.Should().BeNull();
        currentMonth.SnapshotFinalBalanceMonthly.Should().BeNull();

        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-05")).Should().Be(1);

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth.Should().NotBeNull();
        nextMonth!.Status.Should().Be(BudgetMonthStatuses.Closed);
        nextMonth.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.None);
        nextMonth.CarryOverAmount.Should().BeNull();
    }

    [Fact]
    public async Task ReturnsExpectedCloseResultDto()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var clock = new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc));
        var sut = CreateSut(clock);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.ClosedMonth.YearMonth.Should().Be("2026-04");
        dto.ClosedMonth.Status.Should().Be(BudgetMonthStatuses.Closed);
        dto.ClosedMonth.ClosedAtUtc.Should().Be(clock.UtcNow);

        dto.SnapshotTotals.TotalIncomeMonthly.Should().Be(32500m);
        dto.SnapshotTotals.TotalExpensesMonthly.Should().Be(12000m);
        dto.SnapshotTotals.TotalSavingsMonthly.Should().Be(2500m);
        dto.SnapshotTotals.TotalDebtPaymentsMonthly.Should().BeGreaterThan(0m);
        dto.SnapshotTotals.FinalBalanceMonthly.Should().Be(
            dto.SnapshotTotals.TotalIncomeMonthly
            - dto.SnapshotTotals.TotalExpensesMonthly
            - dto.SnapshotTotals.TotalSavingsMonthly
            - dto.SnapshotTotals.TotalDebtPaymentsMonthly);

        dto.NextMonth.YearMonth.Should().Be("2026-05");
        dto.NextMonth.Status.Should().Be(BudgetMonthStatuses.Open);
        dto.NextMonth.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Full);
        dto.NextMonth.CarryOverAmount.Should().BeNull();
    }

    [Fact]
    public async Task RollsBackEntireOperation_WhenCarryOverUpdateFailsMidTransaction()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(
            new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)),
            throwOnCarryOverUpdate: true);

        var command = new CloseBudgetMonthCommand(
            seed.Persoid,
            seed.UserId,
            "2026-04",
            new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full));

        sut.Behavior.Should().NotBeNull();

        var result = await sut.Behavior!.Handle(
            command,
            () => sut.Handler.Handle(command, CancellationToken.None),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Database.Error");

        var currentMonth = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        currentMonth.Should().NotBeNull();
        currentMonth!.Status.Should().Be(BudgetMonthStatuses.Open);
        currentMonth.ClosedAt.Should().BeNull();
        currentMonth.SnapshotTotalIncomeMonthly.Should().BeNull();
        currentMonth.SnapshotTotalExpensesMonthly.Should().BeNull();
        currentMonth.SnapshotTotalSavingsMonthly.Should().BeNull();
        currentMonth.SnapshotTotalDebtPaymentsMonthly.Should().BeNull();
        currentMonth.SnapshotFinalBalanceMonthly.Should().BeNull();

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth.Should().BeNull();
    }

    [Fact]
    public async Task ClosesMonth_WhenFinalBalanceIsNegative()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        await InsertExpenseItemAsync(seed.BudgetId, seed.UserId, "Unexpected bill", 50000m);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.None)),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        var closedMonth = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        closedMonth.Should().NotBeNull();
        closedMonth!.Status.Should().Be(BudgetMonthStatuses.Closed);
        closedMonth.SnapshotTotalExpensesMonthly.Should().Be(62000m);
        closedMonth.SnapshotFinalBalanceMonthly.Should().BeLessThan(0m);
        result.Value!.SnapshotTotals.FinalBalanceMonthly.Should().Be(closedMonth.SnapshotFinalBalanceMonthly!.Value);

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth.Should().NotBeNull();
        nextMonth!.Status.Should().Be(BudgetMonthStatuses.Open);
    }

    [Fact]
    public async Task RejectsInvalidCarryOverMode()
    {
        await _db.ResetAsync();

        var seed = await SeedClosableOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Handler.Handle(
            new CloseBudgetMonthCommand(
                seed.Persoid,
                seed.UserId,
                "2026-04",
                new CloseBudgetMonthRequestDto("custom")),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(Backend.Domain.Errors.Budget.BudgetMonth.InvalidCloseCarryMode.Code);
    }
    private CloseMonthSut CreateSut(ITimeProvider clock, bool throwOnCarryOverUpdate = false)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var realMonths = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        IBudgetMonthRepository months = throwOnCarryOverUpdate
            ? new ThrowingBudgetMonthRepository(realMonths)
            : realMonths;

        var monthDashRepo = new BudgetMonthDashboardRepository(
            uow,
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            clock);

        var seedSource = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            dbOpts);

        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);
        var lifecycle = new BudgetMonthLifecycleService(months, materializer, clock);
        IDebtPaymentCalculator debtCalculator = new DebtPaymentCalculator();
        IBudgetMonthlyTotalsService totals = new BudgetMonthlyTotalsService(monthDashRepo, debtCalculator);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totals);

        var handler = new CloseBudgetMonthCommandHandler(
            months,
            lifecycle,
            monthDashRepo,
            materializer,
            closeSnapshot,
            clock);

        UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>? behavior = null;
        if (throwOnCarryOverUpdate)
        {
            behavior = new UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>(
                uow,
                NullLogger<UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>>.Instance);
        }

        return new CloseMonthSut
        {
            Uow = uow,
            Handler = handler,
            Behavior = behavior
        };
    }

    private async Task<SeedResult> SeedClosableOpenMonthAsync(string yearMonth)
    {
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await SetIncomePaymentTimingAsync(_db.ConnectionString, seed.BudgetId, "dayOfMonth", 25);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: yearMonth,
            status: BudgetMonthStatuses.Open,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        return seed;
    }

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    private async Task<BudgetMonthRow?> GetMonthRowAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<BudgetMonthRow>(
            """
            SELECT
                YearMonth,
                Status,
                ClosedAt,
                CarryOverMode,
                CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly
            FROM BudgetMonth
            WHERE BudgetId = @budgetId
              AND YearMonth = @yearMonth
            LIMIT 1;
            """,
            new { budgetId, yearMonth });
    }

    private async Task<int> CountMonthsForYearMonthAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)
            FROM BudgetMonth
            WHERE BudgetId = @budgetId
              AND YearMonth = @yearMonth;
            """,
            new { budgetId, yearMonth });
    }

    private static async Task SetIncomePaymentTimingAsync(
        string cs,
        Guid budgetId,
        string incomePaymentDayType,
        int? incomePaymentDay)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync(
            """
            UPDATE Income
            SET
                IncomePaymentDayType = @incomePaymentDayType,
                IncomePaymentDay = @incomePaymentDay
            WHERE BudgetId = @budgetId;
            """,
            new
            {
                budgetId,
                incomePaymentDayType,
                incomePaymentDay
            });
    }

    private async Task InsertExpenseItemAsync(
        Guid budgetId,
        Guid userId,
        string name,
        decimal amountMonthly)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync(
            """
            INSERT INTO ExpenseItem
                (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedAt, CreatedByUserId)
            VALUES
                (UUID_TO_BIN(UUID()), @budgetId, UNHEX(REPLACE('f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2','-','')), @name, @amountMonthly, UTC_TIMESTAMP(), @userId);
            """,
            new
            {
                budgetId,
                userId,
                name,
                amountMonthly
            });
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private sealed class ThrowingBudgetMonthRepository : IBudgetMonthRepository
    {
        private readonly IBudgetMonthRepository _inner;

        public ThrowingBudgetMonthRepository(IBudgetMonthRepository inner) => _inner = inner;

        public Task<Guid?> GetBudgetIdByPersoidAsync(Guid persoid, CancellationToken ct)
            => _inner.GetBudgetIdByPersoidAsync(persoid, ct);

        public Task<IReadOnlyList<Backend.Application.Features.Budgets.Months.Models.BudgetMonthListRm>> GetMonthsAsync(Guid budgetId, CancellationToken ct)
            => _inner.GetMonthsAsync(budgetId, ct);

        public Task<IReadOnlyList<Backend.Application.Features.Budgets.Months.Models.BudgetMonthListRm>> GetOpenMonthsAsync(Guid budgetId, CancellationToken ct)
            => _inner.GetOpenMonthsAsync(budgetId, ct);

        public Task<Backend.Application.Features.Budgets.Months.Models.BudgetMonthLookupRm?> GetByBudgetIdAndYearMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct)
            => _inner.GetByBudgetIdAndYearMonthAsync(budgetId, yearMonth, ct);

        public Task<Backend.Application.Features.Budgets.Months.Models.BudgetMonthDetailsRm?> GetMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct)
            => _inner.GetMonthAsync(budgetId, yearMonth, ct);

        public Task<bool> HasAnyMonthsAsync(Guid budgetId, CancellationToken ct)
            => _inner.HasAnyMonthsAsync(budgetId, ct);

        public Task InsertOpenMonthIdempotentAsync(Guid id, Guid budgetId, string yearMonth, string carryOverMode, decimal? carryOverAmount, Guid userId, DateTime nowUtc, CancellationToken ct)
            => _inner.InsertOpenMonthIdempotentAsync(id, budgetId, yearMonth, carryOverMode, carryOverAmount, userId, nowUtc, ct);

        public Task InsertSkippedMonthIdempotentAsync(Guid id, Guid budgetId, string yearMonth, Guid userId, DateTime nowUtc, CancellationToken ct)
            => _inner.InsertSkippedMonthIdempotentAsync(id, budgetId, yearMonth, userId, nowUtc, ct);

        public Task<int> CloseOpenMonthWithSnapshotAsync(Guid budgetMonthId, Guid userId, DateTime nowUtc, decimal totalIncome, decimal totalExpenses, decimal totalSavings, decimal totalDebtPayments, decimal finalBalance, CancellationToken ct)
            => _inner.CloseOpenMonthWithSnapshotAsync(
                budgetMonthId,
                userId,
                nowUtc,
                totalIncome,
                totalExpenses,
                totalSavings,
                totalDebtPayments,
                finalBalance,
                ct);

        public Task<int> UpdateCarryOverSettingsAsync(Guid budgetMonthId, string carryOverMode, decimal? carryOverAmount, Guid userId, DateTime nowUtc, CancellationToken ct)
            => throw new ForcedDbException();

        public Task<int> MarkMonthSkippedAsync(Guid budgetMonthId, Guid userId, DateTime nowUtc, CancellationToken ct)
            => _inner.MarkMonthSkippedAsync(budgetMonthId, userId, nowUtc, ct);

        public Task<int> UpdateBudgetMonthIncomePaymentTimingAsync(Guid budgetMonthId, string incomePaymentDayType, int? incomePaymentDay, Guid actorPersoid, DateTime nowUtc, CancellationToken ct)
            => _inner.UpdateBudgetMonthIncomePaymentTimingAsync(
                budgetMonthId,
                incomePaymentDayType,
                incomePaymentDay,
                actorPersoid,
                nowUtc,
                ct);
    }

    private sealed class ForcedDbException : DbException
    {
        public override string Message => "Forced failure while updating carry-over settings.";
    }

    private sealed class CloseMonthSut
    {
        public required UnitOfWork Uow { get; init; }
        public required CloseBudgetMonthCommandHandler Handler { get; init; }
        public UnitOfWorkPipelineBehavior<CloseBudgetMonthCommand, Backend.Domain.Shared.Result<CloseBudgetMonthResultDto>>? Behavior { get; init; }
    }

    private sealed class BudgetMonthRow
    {
        public string YearMonth { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public DateTime? ClosedAt { get; init; }
        public string CarryOverMode { get; init; } = string.Empty;
        public decimal? CarryOverAmount { get; init; }
        public decimal? SnapshotTotalIncomeMonthly { get; init; }
        public decimal? SnapshotTotalExpensesMonthly { get; init; }
        public decimal? SnapshotTotalSavingsMonthly { get; init; }
        public decimal? SnapshotTotalDebtPaymentsMonthly { get; init; }
        public decimal? SnapshotFinalBalanceMonthly { get; init; }
    }
}
