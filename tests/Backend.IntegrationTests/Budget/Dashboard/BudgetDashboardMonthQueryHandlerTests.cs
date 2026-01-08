using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;
using Backend.Domain.Errors;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Services.Debts;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.Settings;

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

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedWithDataAsync(_db.ConnectionString);

        // Open month with carry: must be custom + amount not null (DB constraint)
        var openedAt = new DateTime(2026, 01, 02, 08, 00, 00, DateTimeKind.Utc);
        await BudgetMonthDsl.InsertOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            carryOverAmount: 1000m,
            createdByUserId: userId,
            openedAtUtc: openedAt);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var handler = new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, calc, clock);

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
        live.CarryOverAmountMonthly.Should().Be(1000m);

        // From seed: income 32500, expenses 12000, savings 2500
        live.DisposableAfterExpensesWithCarryMonthly.Should().Be((32500m - 12000m) + 1000m); // 21500
        live.DisposableAfterExpensesAndSavingsWithCarryMonthly.Should().Be((32500m - 12000m - 2500m) + 1000m); // 19000

        // Final balance with carry = income - expenses - savings - debtPayments + carry
        var debtPayments = live.Debt.TotalMonthlyPayments;
        var expectedFinal = 32500m - 12000m - 2500m - debtPayments + 1000m;
        live.FinalBalanceWithCarryMonthly.Should().Be(expectedFinal);
    }

    [Fact]
    public async Task ClosedMonth_ReturnsSnapshotTotals_AndNoLiveDashboard()
    {
        await _db.ResetAsync();

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedWithDataAsync(_db.ConnectionString);

        // Insert CLOSED month with snapshot columns filled
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

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var handler = new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, calc, clock);

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
        var (persoid, userId, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var handler = new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, calc, clock);

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-1"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(Errors.BudgetMonth.InvalidYearMonth.Code);
    }

    [Fact]
    public async Task WhenYearMonthIsNull_PicksOpenMonthIfExists()
    {
        await _db.ResetAsync();

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedWithDataAsync(_db.ConnectionString);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2025-12",
            openedAtUtc: new DateTime(2025, 12, 15, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        IDebtPaymentCalculator calc = new DebtPaymentCalculator();
        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var handler = new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, calc, clock);

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

        var (persoid, userId, budgetId) = await BudgetSeeds.SeedWithDataAsync(_db.ConnectionString);

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, dbOpts);

        var spy = new SpyDebtPaymentCalculator(constant: 123m);
        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var handler = new GetBudgetDashboardMonthQueryHandler(monthsRepo, dashRepo, spy, clock);

        var result = await handler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None);

        result.IsFailure.Should().BeFalse();

        spy.CallCount.Should().Be(2);
        spy.SeenTypes.Should().BeEquivalentTo(new[] { "revolving", "installment" });

        var live = result.Value!.LiveDashboard!;
        live.Debt.Debts.Should().HaveCount(2);
        live.Debt.Debts.All(d => d.MonthlyPayment == 123m).Should().BeTrue();
        live.Debt.TotalMonthlyPayments.Should().Be(246m);
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
