using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Common.Behaviors;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Income;
using Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;
using Backend.Application.Services.Budget.Materializer;
using Backend.Domain.Abstractions;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Core;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.User;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using System.Data.Common;

namespace Backend.IntegrationTests.Budget.Income;

[Collection("it:db")]
public sealed class UpdateSalaryPaymentTimingCommandHandlerTests
{
    private readonly MariaDbFixture _db;

    public UpdateSalaryPaymentTimingCommandHandlerTests(MariaDbFixture db) => _db = db;

    [Fact]
    public async Task UpdateSalaryPaymentTiming_CurrentMonthOnly_UpdatesBudgetMonthIncomeOnly()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await SetBaselineIncomePaymentTimingAsync(seed.BudgetId, "dayOfMonth", 25);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, null, CancellationToken.None));

        var monthBefore = await GetBudgetMonthIncomePaymentTimingAsync(ensure.Value!.BudgetMonthId);
        var baselineBefore = await GetBaselineIncomePaymentTimingAsync(seed.BudgetId);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    Email: SeedEmail(seed.Persoid),
                    Request: new UpdateSalaryPaymentTimingRequestDto(
                        IncomePaymentDayType: "lastDayOfMonth",
                        IncomePaymentDay: null,
                        UpdateCurrentAndFuture: false)),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().Be(new SalaryPaymentTimingDto("lastDayOfMonth", null, false));

        var monthAfter = await GetBudgetMonthIncomePaymentTimingAsync(ensure.Value!.BudgetMonthId);
        var baselineAfter = await GetBaselineIncomePaymentTimingAsync(seed.BudgetId);

        monthBefore.Should().Be(("dayOfMonth", 25));
        monthAfter.Should().Be(("lastDayOfMonth", null));
        baselineBefore.Should().Be(("dayOfMonth", 25));
        baselineAfter.Should().Be(("dayOfMonth", 25));
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_CurrentAndFuture_UpdatesBothRows()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await SetBaselineIncomePaymentTimingAsync(seed.BudgetId, "dayOfMonth", 25);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, null, CancellationToken.None));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    Email: SeedEmail(seed.Persoid),
                    Request: new UpdateSalaryPaymentTimingRequestDto(
                        IncomePaymentDayType: "dayOfMonth",
                        IncomePaymentDay: 12,
                        UpdateCurrentAndFuture: true)),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().Be(new SalaryPaymentTimingDto("dayOfMonth", 12, true));

        var monthAfter = await GetBudgetMonthIncomePaymentTimingAsync(ensure.Value!.BudgetMonthId);
        var baselineAfter = await GetBaselineIncomePaymentTimingAsync(seed.BudgetId);

        monthAfter.Should().Be(("dayOfMonth", 12));
        baselineAfter.Should().Be(("dayOfMonth", 12));
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_DayOfMonthWithoutDay_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(seed.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("dayOfMonth", null, false)),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("IncomePayment.InvalidDay");
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_DayTooLow_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(seed.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("dayOfMonth", 0, false)),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("IncomePayment.InvalidDay");
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_DayTooHigh_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(seed.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("dayOfMonth", 29, false)),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("IncomePayment.InvalidDay");
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_LastDayOfMonth_WithNonNullDay_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(seed.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("lastDayOfMonth", 15, false)),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("IncomePayment.InvalidDay");
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_RollsBackWhenSecondWriteFails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await SetBaselineIncomePaymentTimingAsync(seed.BudgetId, "dayOfMonth", 25);

        var sut = CreateSut(
            new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)),
            useThrowingIncomeRepository: true);

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, null, CancellationToken.None));

        var monthBefore = await GetBudgetMonthIncomePaymentTimingAsync(ensure.Value!.BudgetMonthId);
        var baselineBefore = await GetBaselineIncomePaymentTimingAsync(seed.BudgetId);

        var result = await sut.Behavior!.Handle(
            new UpdateSalaryPaymentTimingCommand(
                SeedEmail(seed.Persoid),
                new UpdateSalaryPaymentTimingRequestDto("lastDayOfMonth", null, true)),
            () => sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(seed.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("lastDayOfMonth", null, true)),
                CancellationToken.None),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("Database.Error");

        var monthAfter = await GetBudgetMonthIncomePaymentTimingAsync(ensure.Value!.BudgetMonthId);
        var baselineAfter = await GetBaselineIncomePaymentTimingAsync(seed.BudgetId);

        monthAfter.Should().Be(monthBefore);
        baselineAfter.Should().Be(baselineBefore);
    }

    [Fact]
    public async Task UpdateSalaryPaymentTiming_OnlyUpdatesCurrentUsersData()
    {
        await _db.ResetAsync();

        var first = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var second = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await SetBaselineIncomePaymentTimingAsync(first.BudgetId, "dayOfMonth", 25);
        await SetBaselineIncomePaymentTimingAsync(second.BudgetId, "lastDayOfMonth", null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc)));

        var firstEnsure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(first.Persoid, first.Persoid, null, CancellationToken.None));
        var secondEnsure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(second.Persoid, second.Persoid, null, CancellationToken.None));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new UpdateSalaryPaymentTimingCommand(
                    SeedEmail(first.Persoid),
                    new UpdateSalaryPaymentTimingRequestDto("dayOfMonth", 10, true)),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var firstMonthAfter = await GetBudgetMonthIncomePaymentTimingAsync(firstEnsure.Value!.BudgetMonthId);
        var firstBaselineAfter = await GetBaselineIncomePaymentTimingAsync(first.BudgetId);
        var secondMonthAfter = await GetBudgetMonthIncomePaymentTimingAsync(secondEnsure.Value!.BudgetMonthId);
        var secondBaselineAfter = await GetBaselineIncomePaymentTimingAsync(second.BudgetId);

        firstMonthAfter.Should().Be(("dayOfMonth", 10));
        firstBaselineAfter.Should().Be(("dayOfMonth", 10));
        secondMonthAfter.Should().Be(("lastDayOfMonth", null));
        secondBaselineAfter.Should().Be(("lastDayOfMonth", null));
    }

    private SalaryPaymentTimingSut CreateSut(
        ITimeProvider clock,
        bool useThrowingIncomeRepository = false)
    {
        var dbOpts = Options.Create(new DatabaseSettings
        {
            ConnectionString = _db.ConnectionString,
            DefaultCommandTimeoutSeconds = 30
        });

        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var currentUser = new TestCurrentUserContext();
        var users = new UserRepository(uow, NullLogger<UserRepository>.Instance, dbOpts);
        var months = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);
        var lifecycle = new BudgetMonthLifecycleService(months, materializer, clock);
        var realIncomeRepository = new IncomeRepository(
            uow,
            NullLogger<IncomeRepository>.Instance,
            currentUser,
            dbOpts);

        IIncomeRepository incomeRepository = useThrowingIncomeRepository
            ? new ThrowingIncomeRepository()
            : realIncomeRepository;

        var handler = new UpdateSalaryPaymentTimingCommandHandler(
            users,
            months,
            lifecycle,
            incomeRepository,
            clock);

        UnitOfWorkPipelineBehavior<UpdateSalaryPaymentTimingCommand, Result<SalaryPaymentTimingDto>>? behavior = null;
        if (useThrowingIncomeRepository)
        {
            behavior = new UnitOfWorkPipelineBehavior<UpdateSalaryPaymentTimingCommand, Result<SalaryPaymentTimingDto>>(
                uow,
                NullLogger<UnitOfWorkPipelineBehavior<UpdateSalaryPaymentTimingCommand, Result<SalaryPaymentTimingDto>>>.Instance);
        }

        return new SalaryPaymentTimingSut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            Handler = handler,
            Behavior = behavior
        };
    }

    private static string SeedEmail(Guid persoid) => $"month+{persoid:N}@example.com";

    private async Task SetBaselineIncomePaymentTimingAsync(Guid budgetId, string paymentDayType, int? paymentDay)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync(
            """
            UPDATE Income
            SET IncomePaymentDayType = @paymentDayType,
                IncomePaymentDay = @paymentDay
            WHERE BudgetId = @budgetId;
            """,
            new { budgetId, paymentDayType, paymentDay });
    }

    private async Task<(string IncomePaymentDayType, int? IncomePaymentDay)> GetBaselineIncomePaymentTimingAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleAsync<(string IncomePaymentDayType, int? IncomePaymentDay)>(
            """
            SELECT IncomePaymentDayType, CAST(IncomePaymentDay AS SIGNED) AS IncomePaymentDay
            FROM Income
            WHERE BudgetId = @budgetId
            LIMIT 1;
            """,
            new { budgetId });
    }

    private async Task<(string IncomePaymentDayType, int? IncomePaymentDay)> GetBudgetMonthIncomePaymentTimingAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleAsync<(string IncomePaymentDayType, int? IncomePaymentDay)>(
            """
            SELECT IncomePaymentDayType, CAST(IncomePaymentDay AS SIGNED) AS IncomePaymentDay
            FROM BudgetMonthIncome
            WHERE BudgetMonthId = @budgetMonthId
            LIMIT 1;
            """,
            new { budgetMonthId });
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private sealed class TestCurrentUserContext : ICurrentUserContext
    {
        public Guid Persoid { get; init; } = Guid.NewGuid();
        public string UserName { get; init; } = "it@test.local";
    }

    private sealed class ThrowingIncomeRepository : IIncomeRepository
    {
        public Task AddAsync(Backend.Domain.Entities.Budget.Income.Income income, Guid budgetId, CancellationToken ct)
            => Task.CompletedTask;

        public Task<int> UpdatePaymentTimingAsync(
            Guid budgetId,
            string incomePaymentDayType,
            int? incomePaymentDay,
            Guid actorPersoid,
            DateTime nowUtc,
            CancellationToken ct)
            => throw new ForcedDbException();
    }

    private sealed class ForcedDbException : DbException
    {
        public override string Message => "Forced failure on baseline income update.";
    }

    private sealed class SalaryPaymentTimingSut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required UpdateSalaryPaymentTimingCommandHandler Handler { get; init; }
        public UnitOfWorkPipelineBehavior<UpdateSalaryPaymentTimingCommand, Result<SalaryPaymentTimingDto>>? Behavior { get; init; }
    }
}
