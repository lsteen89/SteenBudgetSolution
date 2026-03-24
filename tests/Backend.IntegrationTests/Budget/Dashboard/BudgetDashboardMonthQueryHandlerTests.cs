using System;
using System.Linq;
using System.Threading;
using Backend.Infrastructure.Repositories.User;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;

namespace Backend.IntegrationTests.Budget.Dashboard;

[Collection("it:db")]
public sealed class BudgetDashboardMonthQueryHandlerTests
{
    private readonly MariaDbFixture _db;
    public BudgetDashboardMonthQueryHandlerTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings { ConnectionString = cs, DefaultCommandTimeoutSeconds = 30 });

    [Fact]
    public async Task OpenMonth_ReturnsLiveDashboard_WithCarryApplied()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        var openedAt = new DateTime(2026, 01, 02, 08, 00, 00, DateTimeKind.Utc);
        await BudgetMonthDsl.InsertOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            carryOverAmount: 1000m,
            createdByUserId: userId,
            openedAtUtc: openedAt);

        var handler = BuildHandler(_db.ConnectionString, debtCalc: new DebtPaymentCalculator(),
            clockUtcNow: new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be("2026-01");
        dto.Month.Status.Should().Be("open");
        dto.Month.CarryOverAmount.Should().Be(1000m);

        dto.SnapshotTotals.Should().BeNull();
        dto.LiveDashboard.Should().NotBeNull();

        var live = dto.LiveDashboard!;

        var habitSavings = live.Savings?.MonthlySavings ?? 0m;
        var goalSavings = live.Savings?.Goals.Sum(g => g.MonthlyContribution) ?? 0m;
        var totalSavings = habitSavings + goalSavings;

        live.DisposableAfterExpensesWithCarryMonthly
            .Should().Be((32500m - 12000m) + 1000m);

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be((32500m - 12000m - totalSavings) + 1000m);

        var debtPayments = live.Debt.TotalMonthlyPayments;
        var expectedFinal = 32500m - 12000m - totalSavings - debtPayments + 1000m;
        live.FinalBalanceWithCarryMonthly.Should().Be(expectedFinal);
    }

    [Fact]
    public async Task ClosedMonth_ReturnsSnapshotTotals_AndNoLiveDashboard()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await InsertClosedMonthWithSnapshotAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2025-12",
            createdByUserId: userId,
            openedAtUtc: new DateTime(2025, 12, 01, 08, 00, 00, DateTimeKind.Utc),
            closedAtUtc: new DateTime(2025, 12, 31, 20, 00, 00, DateTimeKind.Utc),
            totalIncome: 32500m,
            totalExpenses: 12000m,
            totalSavings: 2500m,
            totalDebtPayments: 500m,
            finalBalance: 17500m);

        var handler = BuildHandler(_db.ConnectionString, debtCalc: new DebtPaymentCalculator(),
            clockUtcNow: new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2025-12"), CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be("2025-12");
        dto.Month.Status.Should().Be("closed");

        dto.LiveDashboard.Should().BeNull();
        dto.SnapshotTotals.Should().NotBeNull();

        dto.SnapshotTotals!.TotalIncomeMonthly.Should().Be(32500m);
        dto.SnapshotTotals.TotalExpensesMonthly.Should().Be(12000m);
        dto.SnapshotTotals.TotalSavingsMonthly.Should().Be(2500m);
        dto.SnapshotTotals.TotalDebtPaymentsMonthly.Should().Be(500m);
        dto.SnapshotTotals.FinalBalanceMonthly.Should().Be(17500m);
    }

    [Fact]
    public async Task InvalidYearMonth_FailsValidation()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;

        var handler = BuildHandler(_db.ConnectionString, debtCalc: new DebtPaymentCalculator(),
            clockUtcNow: new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-1"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.InvalidYearMonth.Code);
    }

    [Fact]
    public async Task WhenYearMonthIsNull_PicksOpenMonthIfExists()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2025-12",
            openedAtUtc: new DateTime(2025, 12, 15, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var handler = BuildHandler(_db.ConnectionString, debtCalc: new DebtPaymentCalculator(),
            clockUtcNow: new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, null), CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value!.Month.YearMonth.Should().Be("2025-12");
        result.Value!.Month.Status.Should().Be("open");
        result.Value!.LiveDashboard.Should().NotBeNull();
    }

    [Fact]
    public async Task UsesInjectedDebtPaymentCalculator_SpyStub_ForLiveDashboard()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var spy = new SpyDebtPaymentCalculator(constant: 123m);

        var handler = BuildHandler(_db.ConnectionString, debtCalc: spy,
            clockUtcNow: new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None);

        result.IsFailure.Should().BeFalse();

        spy.CallCount.Should().Be(2);
        spy.SeenTypes.Should().BeEquivalentTo(new[] { "revolving", "installment" });

        var live = result.Value!.LiveDashboard!;
        live.Debt.Debts.Should().HaveCount(2);
        live.Debt.Debts.All(d => d.MonthlyPayment == 123m).Should().BeTrue();
        live.Debt.TotalMonthlyPayments.Should().Be(246m);
    }
    [Fact]
    public async Task OpenMonth_IncludesGoalMonthlyContribution_AndAffectsTotals()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            carryOverAmount: 0m,
            createdByUserId: userId,
            openedAtUtc: new DateTime(2026, 01, 02, 08, 00, 00, DateTimeKind.Utc));

        var now = new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc);
        var targetDate = now.AddMonths(10);
        var targetAmount = 50_000m;
        var amountSaved = 10_000m;

        // Insert a goal into DB so repo must compute MonthlyContribution
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            // You need the SavingsId linked to budget
            var savingsId = await conn.ExecuteScalarAsync<Guid>(@"
            SELECT Id FROM Savings WHERE BudgetId = @bid LIMIT 1;
        ", new { bid = budgetId });

            await conn.ExecuteAsync(@"
            INSERT INTO SavingsGoal
            (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @sid, 'TestGoal', @ta, @td, @as, UTC_TIMESTAMP(), @uid);
        ", new { sid = savingsId, ta = targetAmount, td = targetDate, @as = amountSaved, uid = userId });
        }

        var handler = BuildHandler(_db.ConnectionString, new DebtPaymentCalculator(), now);

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None);
        result.IsFailure.Should().BeFalse();

        var live = result.Value!.LiveDashboard!;
        live.Savings.Should().NotBeNull();

        var goal = live.Savings!.Goals.Single(g => g.Name == "TestGoal");
        goal.MonthlyContribution.Should().BeGreaterThan(0m);

        var habit = live.Savings.MonthlySavings;
        var goals = live.Savings.Goals.Sum(g => g.MonthlyContribution);
        var totalSavings = habit + goals;

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be(live.Income.TotalIncomeMonthly - live.Expenditure.TotalExpensesMonthly - totalSavings + live.CarryOverAmountMonthly);

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be(live.Income.TotalIncomeMonthly - live.Expenditure.TotalExpensesMonthly - totalSavings);

        totalSavings.Should().Be(MoneyRound.Kr(totalSavings));
    }


    // -------------------------
    // SUT factory
    // -------------------------
    private static GetBudgetDashboardMonthQueryHandler BuildHandler(string cs, IDebtPaymentCalculator debtCalc, DateTime clockUtcNow)
    {
        var opts = DbOptions(cs);
        ITimeProvider clock = new FakeTimeProvider(clockUtcNow);
        var uow = new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance);
        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, opts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, opts, clock);
        var userRepo = new UserRepository(uow, NullLogger<UserRepository>.Instance, opts);

        var projector = new BudgetDashboardProjector(debtCalc);

        return new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, userRepo, projector, clock);
    }

    // ---- helpers ----

    private static async Task InsertClosedMonthWithSnapshotAsync(
        string cs,
        Guid budgetId,
        string ym,
        Guid createdByUserId,
        DateTime openedAtUtc,
        DateTime closedAtUtc,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (
                Id, BudgetId, YearMonth, Status,
                OpenedAt, ClosedAt,
                CarryOverMode, CarryOverAmount,
                SnapshotTotalIncomeMonthly,
                SnapshotTotalExpensesMonthly,
                SnapshotTotalSavingsMonthly,
                SnapshotTotalDebtPaymentsMonthly,
                SnapshotFinalBalanceMonthly,
                CreatedAt, CreatedByUserId
            )
            VALUES
            (
                UUID_TO_BIN(UUID()), @bid, @ym, 'closed',
                @openedAt, @closedAt,
                'none', NULL,
                @ti, @te, @ts, @td, @fb,
                UTC_TIMESTAMP(), @uid
            );
        """, new
        {
            bid = budgetId,
            ym,
            openedAt = openedAtUtc,
            closedAt = closedAtUtc,
            ti = totalIncome,
            te = totalExpenses,
            ts = totalSavings,
            td = totalDebtPayments,
            fb = finalBalance,
            uid = createdByUserId
        });
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private sealed class SpyDebtPaymentCalculator : IDebtPaymentCalculator
    {
        private readonly decimal _constant;
        public int CallCount { get; private set; }
        public string[] SeenTypes { get; private set; } = Array.Empty<string>();

        public SpyDebtPaymentCalculator(decimal constant) => _constant = constant;

        public decimal CalculateMonthlyPayment(IDebtPaymentInput input)
        {
            CallCount++;
            SeenTypes = SeenTypes.Concat(new[] { input.Type }).ToArray();
            return _constant;
        }
    }
}
