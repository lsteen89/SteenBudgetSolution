using System;
using System.Linq;
using System.Threading;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using MySqlConnector;
using Dapper;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using FluentAssertions;
using FluentAssertions.Execution;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Repositories.User;

namespace Backend.IntegrationTests.Budget.CoreBudget;

[Collection("it:db")]
public sealed class BudgetDashboardMonthQueryHandlerTests
{
    private readonly MariaDbFixture _db;
    public BudgetDashboardMonthQueryHandlerTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    [Fact]
    public async Task Handle_WhenOpenMonth_ReturnsLiveDashboard_AndComputesDebtPayments_WithRealCalculator()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var ym = "2026-01";
        await BudgetMonthSeeds.SeedOpenMonthAsync(
            _db.ConnectionString,
            budgetId,
            ym,
            carryOverMode: "none",
            carryOverAmount: null,
            createdByUserId: persoid
        );

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));
        var sut = BuildSut(_db.ConnectionString, clock, debtCalc: new DebtPaymentCalculator());

        var result = await sut.Handle(new GetBudgetDashboardMonthQuery(persoid, YearMonth: null), CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be(ym);
        dto.Month.Status.Should().Be("open");
        dto.CurrencyCode.Should().Be("SEK");
        dto.SnapshotTotals.Should().BeNull();
        dto.LiveDashboard.Should().NotBeNull();

        var live = dto.LiveDashboard!;
        live.BudgetId.Should().Be(budgetId);

        live.Income.TotalIncomeMonthly.Should().Be(32500m);
        live.Expenditure.TotalExpensesMonthly.Should().Be(12000m);
        live.Savings!.MonthlySavings.Should().Be(2500m);

        var cc = live.Debt.Debts.Single(d => d.Name == "Credit Card");
        cc.MonthlyPayment.Should().Be(320m); // 300 + 20

        var csn = live.Debt.Debts.Single(d => d.Name == "CSN");
        var expectedInstallment = Amortize(5000m, 0.5m, 24) + 10m;
        csn.MonthlyPayment.Should().Be(expectedInstallment);

        live.Debt.TotalMonthlyPayments.Should().Be(320m + expectedInstallment);
        live.Debt.TotalDebtBalance.Should().Be(15000m);
    }

    [Fact]
    public async Task Handle_WhenOpenMonth_UsesInjectedDebtPaymentCalculator_SpyStub()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var ym = "2026-01";
        await BudgetMonthSeeds.SeedOpenMonthAsync(
            _db.ConnectionString,
            budgetId,
            ym,
            carryOverMode: "none",
            carryOverAmount: null,
            createdByUserId: persoid
        );

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));
        var spy = new SpyDebtPaymentCalculator(constant: 123m);
        var sut = BuildSut(_db.ConnectionString, clock, debtCalc: spy);

        var result = await sut.Handle(new GetBudgetDashboardMonthQuery(persoid, YearMonth: null), CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be(ym);
        dto.LiveDashboard.Should().NotBeNull();

        // proves calculator called per debt
        spy.CallCount.Should().Be(2);
        spy.SeenTypes.Should().BeEquivalentTo(new[] { "revolving", "installment" });

        var live = dto.LiveDashboard!;
        live.BudgetId.Should().Be(budgetId);

        live.Debt.Debts.Should().HaveCount(2);
        live.Debt.Debts.Should().OnlyContain(d => d.MonthlyPayment == 123m);
        live.Debt.TotalMonthlyPayments.Should().Be(246m);
        live.Debt.TotalDebtBalance.Should().Be(15000m);

        // quick sanity: non-debt still correct
        live.Income.TotalIncomeMonthly.Should().Be(32500m);
        live.Expenditure.TotalExpensesMonthly.Should().Be(12000m);
        live.Savings!.MonthlySavings.Should().Be(2500m);
    }

    [Fact]
    public async Task Handle_WhenClosedMonth_ReturnsSnapshot_AndNoLiveDashboard()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var ym = "2025-12";

        await BudgetMonthSeeds.SeedClosedMonthAsync(
            _db.ConnectionString,
            budgetId,
            ym,
            carryOverMode: "none",
            carryOverAmount: null,
            totalIncome: 32500m,
            totalExpenses: 12000m,
            totalSavings: 2500m,
            totalDebtPayments: 999m,
            finalBalance: 18000m,
            createdByUserId: persoid
        );

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));
        var sut = BuildSut(_db.ConnectionString, clock, debtCalc: new DebtPaymentCalculator());

        var result = await sut.Handle(new GetBudgetDashboardMonthQuery(persoid, YearMonth: ym), CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be(ym);
        dto.Month.Status.Should().Be("closed");
        dto.CurrencyCode.Should().Be("SEK");

        dto.LiveDashboard.Should().BeNull();
        dto.SnapshotTotals.Should().NotBeNull();
        dto.SnapshotTotals!.TotalIncomeMonthly.Should().Be(32500m);
        dto.SnapshotTotals.TotalExpensesMonthly.Should().Be(12000m);
        dto.SnapshotTotals.TotalSavingsMonthly.Should().Be(2500m);
        dto.SnapshotTotals.TotalDebtPaymentsMonthly.Should().Be(999m);
        dto.SnapshotTotals.FinalBalanceMonthly.Should().Be(18000m);
    }

    [Fact]
    public async Task Handle_WhenYearMonthInvalid_ReturnsInvalidYearMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await BudgetMonthSeeds.SeedOpenMonthAsync(_db.ConnectionString, seed.BudgetId, "2026-01", "none", null, seed.Persoid);

        var sut = BuildSut(_db.ConnectionString, new FakeTimeProvider(DateTime.UtcNow), new DebtPaymentCalculator());

        var result = await sut.Handle(new GetBudgetDashboardMonthQuery(seed.Persoid, "2026-13"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(BudgetMonth.InvalidYearMonth);
    }

    [Fact]
    public async Task Handle_WhenMonthNotFound_ReturnsMonthNotFound()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        var sut = BuildSut(_db.ConnectionString, new FakeTimeProvider(DateTime.UtcNow), new DebtPaymentCalculator());

        var result = await sut.Handle(new GetBudgetDashboardMonthQuery(seed.Persoid, "2026-01"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(BudgetMonth.MonthNotFound);
    }
    [Fact]
    public async Task Handle_WhenUserPreferenceCurrencyIsUsd_ReturnsUsdCurrencyCode()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var ym = "2026-01";
        await BudgetMonthSeeds.SeedOpenMonthAsync(
            _db.ConnectionString,
            budgetId,
            ym,
            carryOverMode: "none",
            carryOverAmount: null,
            createdByUserId: persoid
        );

        await SetUserCurrencyAsync(_db.ConnectionString, persoid, "USD");

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));
        var sut = BuildSut(_db.ConnectionString, clock, debtCalc: new DebtPaymentCalculator());

        var result = await sut.Handle(
            new GetBudgetDashboardMonthQuery(persoid, YearMonth: ym),
            CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.CurrencyCode.Should().Be("USD");
        dto.Month.YearMonth.Should().Be(ym);
        dto.Month.Status.Should().Be("open");
        dto.LiveDashboard.Should().NotBeNull();
    }
    // -------------------------
    // SUT factory
    // -------------------------
    private static GetBudgetDashboardMonthQueryHandler BuildSut(string cs, ITimeProvider clock, IDebtPaymentCalculator debtCalc)
    {
        var opts = DbOptions(cs);

        var uow = new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance);
        var months = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, opts);
        var dashRepo = new BudgetDashboardRepository(uow, NullLogger<BudgetDashboardRepository>.Instance, opts, clock);
        var projector = new BudgetDashboardProjector(debtCalc);
        var users = new UserRepository(uow, NullLogger<UserRepository>.Instance, opts);


        return new GetBudgetDashboardMonthQueryHandler(months, dashRepo, users, projector, clock);
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
    private static async Task SetUserCurrencyAsync(string cs, Guid persoid, string currency)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        const string sql = """
        INSERT INTO UserSettings (Persoid, Locale, Currency)
        VALUES (@Persoid, 'en-US', @Currency)
        ON DUPLICATE KEY UPDATE
            Currency = VALUES(Currency);
        """;

        await conn.ExecuteAsync(sql, new
        {
            Persoid = persoid,
            Currency = currency
        });
    }
}
