using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Backend.Application.Services.Budget.Materializer;

using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;

using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Services.Debts;

using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Services.Budget.Compute;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class BudgetMonthLifecycleTests
{
    private readonly MariaDbFixture _db;
    public BudgetMonthLifecycleTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs, DefaultCommandTimeoutSeconds = 30 });

    [Fact]
    public async Task StartMonth_ClosePrevious_OpensTarget_SnapshotsCorrectly()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2025-12",
            status: "open",
            openedAtUtc: new DateTime(2025, 12, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: "none",
            carryOverAmount: null);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetMonthDashboardRepository(uow, NullLogger<BudgetMonthDashboardRepository>.Instance, dbOpts, time);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        IBudgetMonthlyTotalsService totalsSvc = new BudgetMonthlyTotalsService(dashRepo, calc);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totalsSvc);

        var seedSource = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            dbOpts);

        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, time);

        var openMonth = await monthsRepo.GetByBudgetIdAndYearMonthAsync(
            budgetId,
            "2025-12",
            CancellationToken.None);

        openMonth.Should().NotBeNull();

        var materialized = await uow.InTx(CancellationToken.None, () =>
            materializer.MaterializeIfMissingAsync(
                budgetId,
                openMonth!.Id,
                persoid,
                CancellationToken.None));

        materialized.IsSuccess.Should().BeTrue();

        var handler = new StartBudgetMonthCommandHandler(
            months: monthsRepo,
            closeSnapshot: closeSnapshot,
            totals: totalsSvc,
            time: time,
            log: NullLogger<StartBudgetMonthCommandHandler>.Instance);

        var req = new StartBudgetMonthRequestDto(
            TargetYearMonth: "2026-01",
            ClosePreviousOpenMonth: true,
            CarryOverMode: BudgetMonthCarryOverModes.None,
            CarryOverAmount: null,
            CreateSkippedMonths: true);

        var result = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new StartBudgetMonthCommand(persoid, userId, req), CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var rows = (await conn.QueryAsync<BudgetMonthDbRow>(@"
            SELECT
                HEX(ID) AS Id,
                YearMonth,
                Status,
                CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly
            FROM BudgetMonth
            WHERE BudgetId = @bid
            ORDER BY YearMonth;
        ", new { bid = budgetId })).ToList();

        rows.Should().ContainSingle(x => x.YearMonth == "2025-12" && x.Status == "closed");
        rows.Should().ContainSingle(x => x.YearMonth == "2026-01" && x.Status == "open");

        var closed = rows.Single(x => x.YearMonth == "2025-12");
        closed.SnapshotTotalIncomeMonthly.Should().Be(32500m);
        closed.SnapshotTotalExpensesMonthly.Should().Be(12000m);
        closed.SnapshotTotalSavingsMonthly.Should().Be(2500.00m);

        var expectedInstallment = Amortize(5000m, 0.5m, 24) + 10m;
        var expectedDebtPayments = 320m + expectedInstallment;

        closed.SnapshotTotalDebtPaymentsMonthly.Should().Be(expectedDebtPayments);

        var expectedFinal =
            closed.SnapshotTotalIncomeMonthly!.Value
            - closed.SnapshotTotalExpensesMonthly!.Value
            - closed.SnapshotTotalSavingsMonthly!.Value
            - closed.SnapshotTotalDebtPaymentsMonthly!.Value;

        closed.SnapshotFinalBalanceMonthly.Should().Be(expectedFinal);

        var open = rows.Single(x => x.YearMonth == "2026-01");
        open.CarryOverAmount.Should().Be(0m);
    }

    [Fact]
    public async Task StartMonth_WhenGap_CreatesSkippedPlaceholders()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2025-10",
            status: "open",
            openedAtUtc: new DateTime(2025, 10, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: "none",
            carryOverAmount: null);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetMonthDashboardRepository(uow, NullLogger<BudgetMonthDashboardRepository>.Instance, dbOpts, time);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        IBudgetMonthlyTotalsService totalsSvc = new BudgetMonthlyTotalsService(dashRepo, calc);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totalsSvc);


        var handler = new StartBudgetMonthCommandHandler(
            monthsRepo, closeSnapshot, totalsSvc, time, NullLogger<StartBudgetMonthCommandHandler>.Instance);

        var req = new StartBudgetMonthRequestDto(
            TargetYearMonth: "2026-01",
            ClosePreviousOpenMonth: true,
            CarryOverMode: BudgetMonthCarryOverModes.None,
            CarryOverAmount: null,
            CreateSkippedMonths: true);

        var result = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new StartBudgetMonthCommand(persoid, userId, req), CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var months = (await conn.QueryAsync<(string YearMonth, string Status)>(@"
            SELECT YearMonth, Status
            FROM BudgetMonth
            WHERE BudgetId = @bid
            ORDER BY YearMonth;
        ", new { bid = budgetId })).ToList();

        months.Should().Contain(x => x.YearMonth == "2025-10" && x.Status == "closed");
        months.Should().Contain(x => x.YearMonth == "2025-11" && x.Status == "skipped");
        months.Should().Contain(x => x.YearMonth == "2025-12" && x.Status == "skipped");
        months.Should().Contain(x => x.YearMonth == "2026-01" && x.Status == "open");
    }

    [Fact]
    public async Task StartMonth_IsIdempotent_WhenTargetAlreadyOpen()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2025-12",
            status: "open",
            openedAtUtc: new DateTime(2025, 12, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: "none",
            carryOverAmount: null);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetMonthDashboardRepository(uow, NullLogger<BudgetMonthDashboardRepository>.Instance, dbOpts, time);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        IBudgetMonthlyTotalsService totalsSvc = new BudgetMonthlyTotalsService(dashRepo, calc);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totalsSvc);


        var handler = new StartBudgetMonthCommandHandler(
            monthsRepo, closeSnapshot, totalsSvc, time, NullLogger<StartBudgetMonthCommandHandler>.Instance);

        var req = new StartBudgetMonthRequestDto(
            TargetYearMonth: "2026-01",
            ClosePreviousOpenMonth: true,
            CarryOverMode: BudgetMonthCarryOverModes.None,
            CarryOverAmount: null,
            CreateSkippedMonths: true);

        (await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new StartBudgetMonthCommand(persoid, userId, req), CancellationToken.None)))
            .IsFailure.Should().BeFalse();

        (await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new StartBudgetMonthCommand(persoid, userId, req), CancellationToken.None)))
            .IsFailure.Should().BeFalse();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var openCount = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*)
            FROM BudgetMonth
            WHERE BudgetId = @bid
            AND Status = 'open';
        ", new { bid = budgetId });

        openCount.Should().Be(1);

        var openYm = await conn.ExecuteScalarAsync<string>(@"
            SELECT YearMonth
            FROM BudgetMonth
            WHERE BudgetId = @bid
            AND Status = 'open'
            LIMIT 1;
        ", new { bid = budgetId });

        openYm.Should().Be("2026-01");
    }
    [Fact]
    public async Task BaselineSavingsGoalContribution_IsReadCorrectly()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var savingsId = Guid.NewGuid();

            await conn.ExecuteAsync("""
            INSERT INTO Savings
            (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
            VALUES
            (@Id, @BudgetId, 2500, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = savingsId,
                BudgetId = budgetId,
                UserId = userId
            });

            await conn.ExecuteAsync("""
            INSERT INTO SavingsGoal
            (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedAt, CreatedByUserId)
            VALUES
            (@Id, @SavingsId, 'Emergency fund', 50000, '2026-12-31', 10000, 750, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = Guid.NewGuid(),
                SavingsId = savingsId,
                UserId = userId
            });
        }

        var dbOpts = DbOptions(_db.ConnectionString);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc));
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var repo = new BudgetDashboardRepository(
            uow,
            NullLogger<BudgetDashboardRepository>.Instance,
            dbOpts,
            time);

        var data = await repo.GetDashboardDataAsync(persoid, CancellationToken.None);

        data.Should().NotBeNull();
        data!.Savings.Should().NotBeNull();

        var goal = data.Savings!.Goals.Single(g => g.Name == "Emergency fund");
        goal.MonthlyContribution.Should().Be(750m);
    }

    private static decimal Amortize(decimal principal, decimal annualRatePercent, int months)
    {
        if (principal <= 0m || months <= 0) return 0m;
        if (annualRatePercent <= 0m)
            return Math.Round(principal / months, 2, MidpointRounding.AwayFromZero);

        var r = (annualRatePercent / 100m) / 12m;
        var denom = 1m - (decimal)Math.Pow((double)(1m + r), -months);
        if (denom == 0m) return 0m;

        return Math.Round(principal * r / denom, 2, MidpointRounding.AwayFromZero);
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private sealed record BudgetMonthDbRow(
        string Id,
        string YearMonth,
        string Status,
        decimal CarryOverAmount,
        decimal? SnapshotTotalIncomeMonthly,
        decimal? SnapshotTotalExpensesMonthly,
        decimal? SnapshotTotalSavingsMonthly,
        decimal? SnapshotTotalDebtPaymentsMonthly,
        decimal? SnapshotFinalBalanceMonthly
    );
}
