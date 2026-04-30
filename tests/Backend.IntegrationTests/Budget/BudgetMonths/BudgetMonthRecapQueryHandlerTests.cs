using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Recap;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
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
public sealed class BudgetMonthRecapQueryHandlerTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthRecapQueryHandlerTests(MariaDbFixture db)
    {
        _db = db;
    }

    [Fact]
    public async Task ClosedMonth_ReturnsMetaCarryOverAndSnapshotTotals_FromBudgetMonthSnapshotColumns()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await InsertClosedMonthWithSnapshotAsync(
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            createdByUserId: seed.UserId,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.Custom,
            carryOverAmount: 777m,
            totalIncome: 101m,
            totalExpenses: 202m,
            totalSavings: 303m,
            totalDebtPayments: 404m,
            finalBalance: -808m);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be("2026-04");
        dto.Month.Status.Should().Be(BudgetMonthStatuses.Closed);
        dto.Month.OpenedAtUtc.Should().Be(new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc));
        dto.Month.ClosedAtUtc.Should().Be(new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc));
        dto.Month.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Custom);
        dto.Month.CarryOverAmount.Should().Be(777m);

        dto.SnapshotTotals.TotalIncomeMonthly.Should().Be(101m);
        dto.SnapshotTotals.TotalExpensesMonthly.Should().Be(202m);
        dto.SnapshotTotals.TotalSavingsMonthly.Should().Be(303m);
        dto.SnapshotTotals.TotalDebtPaymentsMonthly.Should().Be(404m);
        dto.SnapshotTotals.FinalBalanceMonthly.Should().Be(-808m);
    }

    [Fact]
    public async Task ClosedMonth_ReturnsNearestPreviousClosedNonSkippedMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-01", seed.UserId);
        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-02", seed.UserId);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-03",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 03, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 03, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.PreviousComparableYearMonth.Should().Be("2026-02");
        result.Value.Comparison.HasPreviousComparableMonth.Should().BeTrue();
    }

    [Fact]
    public async Task ClosedMonth_ReturnsNullPreviousComparableMonth_WhenNoneExists()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await InsertClosedMonthWithSnapshotAsync(seed.BudgetId, "2026-04", seed.UserId);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Comparison.PreviousComparableYearMonth.Should().BeNull();
        result.Value.Comparison.HasPreviousComparableMonth.Should().BeFalse();
    }

    [Fact]
    public async Task OpenMonth_ReturnsClearDomainFailure()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            ym: "2026-04",
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonth.RecapRequiresClosedMonth.Code);
    }

    [Fact]
    public async Task SkippedMonth_ReturnsClearDomainFailure()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 04, 30, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var handler = CreateHandler();

        var result = await handler.Handle(
            new GetBudgetMonthRecapQuery(seed.Persoid, "2026-04"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonth.RecapRequiresClosedMonth.Code);
    }

    private GetBudgetMonthRecapQueryHandler CreateHandler()
    {
        var opts = Options.Create(new DatabaseSettings
        {
            ConnectionString = _db.ConnectionString,
            DefaultCommandTimeoutSeconds = 30
        });

        var uow = new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, opts);

        return new GetBudgetMonthRecapQueryHandler(repo);
    }

    private Task InsertClosedMonthWithSnapshotAsync(
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId)
        => InsertClosedMonthWithSnapshotAsync(
            budgetId,
            yearMonth,
            createdByUserId,
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            totalIncome: 1000m,
            totalExpenses: 200m,
            totalSavings: 300m,
            totalDebtPayments: 400m,
            finalBalance: 100m);

    private async Task InsertClosedMonthWithSnapshotAsync(
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId,
        DateTime openedAtUtc,
        DateTime closedAtUtc,
        string carryOverMode,
        decimal? carryOverAmount,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (
                Id,
                BudgetId,
                YearMonth,
                Status,
                OpenedAt,
                ClosedAt,
                CarryOverMode,
                CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly,
                CreatedAt,
                CreatedByUserId
            )
            VALUES
            (
                UUID_TO_BIN(UUID()),
                @BudgetId,
                @YearMonth,
                'closed',
                @OpenedAtUtc,
                @ClosedAtUtc,
                @CarryOverMode,
                @CarryOverAmount,
                @TotalIncome,
                @TotalExpenses,
                @TotalSavings,
                @TotalDebtPayments,
                @FinalBalance,
                UTC_TIMESTAMP(),
                @CreatedByUserId
            );
        """, new
        {
            BudgetId = budgetId,
            YearMonth = yearMonth,
            OpenedAtUtc = openedAtUtc,
            ClosedAtUtc = closedAtUtc,
            CarryOverMode = carryOverMode,
            CarryOverAmount = carryOverAmount,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            TotalSavings = totalSavings,
            TotalDebtPayments = totalDebtPayments,
            FinalBalance = finalBalance,
            CreatedByUserId = createdByUserId
        });
    }
}
