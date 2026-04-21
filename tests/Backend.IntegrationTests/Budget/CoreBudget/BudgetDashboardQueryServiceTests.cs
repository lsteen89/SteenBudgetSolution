using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using MySqlConnector;
using Dapper;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using FluentAssertions;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using FluentAssertions.Execution;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Application.Services.Budget.Materializer;
using Backend.Infrastructure.Repositories.User;
using Backend.Application.BudgetMonths.Services;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Backend.Application.Common.Behaviors;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;


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

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

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
        cc.MonthlyPayment.Should().Be(320m);

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

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, spy);
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be(ym);
        dto.LiveDashboard.Should().NotBeNull();

        spy.CallCount.Should().Be(2);
        spy.SeenTypes.Should().BeEquivalentTo(new[] { "revolving", "installment" });

        var live = dto.LiveDashboard!;
        live.BudgetId.Should().Be(budgetId);

        live.Debt.Debts.Should().HaveCount(2);
        live.Debt.Debts.Should().OnlyContain(d => d.MonthlyPayment == 123m);
        live.Debt.TotalMonthlyPayments.Should().Be(246m);
        live.Debt.TotalDebtBalance.Should().Be(15000m);

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

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, ym),
            CancellationToken.None);

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

        var clock = new FakeTimeProvider(DateTime.UtcNow);

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(seed.Persoid, "2026-13"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BudgetMonth.InvalidYearMonth");
    }

    [Fact]
    public async Task Handle_WhenRequestedMonthMissing_EnsuresMonth_AndReturnsDashboard()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var requestedYm = "2026-04";

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        var mediator = sp.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, requestedYm),
            CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be(requestedYm);
        dto.Month.Status.Should().Be("open");
        dto.LiveDashboard.Should().NotBeNull();
        dto.SnapshotTotals.Should().BeNull();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var count = await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonth
        WHERE BudgetId = @BudgetId
          AND YearMonth = @YearMonth;
    ", new
        {
            BudgetId = budgetId,
            YearMonth = requestedYm
        });

        count.Should().Be(1);
    }
    [Fact]
    public async Task Handle_WhenBudgetMissing_ReturnsFailure()
    {
        await _db.ResetAsync();

        var clock = new FakeTimeProvider(DateTime.UtcNow);

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(Guid.NewGuid(), null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Budget.NotFound");
    }
    [Fact]
    public async Task Handle_WhenUserHasZeroMonths_BootstrapsCurrentMonth_AndReturnsDashboard()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 15, 12, 0, 0, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

        using var _ = new AssertionScope();

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.YearMonth.Should().Be("2026-01");
        dto.Month.Status.Should().Be("open");
        dto.LiveDashboard.Should().NotBeNull();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var count = await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonth
        WHERE BudgetId = @BudgetId;
    ", new { BudgetId = budgetId });

        count.Should().Be(1);
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

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, ym),
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
    private static GetBudgetDashboardMonthQueryHandler BuildSut(
        string cs,
        ITimeProvider clock,
        IDebtPaymentCalculator debtCalc)
    {
        var opts = DbOptions(cs);

        var uow = new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance);

        var months = new BudgetMonthRepository(
            uow,
            NullLogger<BudgetMonthRepository>.Instance,
            opts);

        var seedSource = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            opts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            opts);


        var materializer = new BudgetMonthMaterializer(
        seedSource,
        materializationRepo,
        clock);

        var lifecycle = new BudgetMonthLifecycleService(months, materializer, clock);

        var dashRepo = new BudgetMonthDashboardRepository(
            uow,
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            opts,
            clock);

        var projector = new BudgetDashboardProjector(debtCalc);

        var users = new UserRepository(
            uow,
            NullLogger<UserRepository>.Instance,
            opts);

        return new GetBudgetDashboardMonthQueryHandler(
            lifecycle,
            months,
            dashRepo,
            users,
            projector,
            clock);
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
    private static async Task SetIncomePaymentTimingAsync(
    string cs,
    Guid budgetId,
    string incomePaymentDayType,
    int? incomePaymentDay)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        const string sql = """
    UPDATE Income
    SET
        IncomePaymentDayType = @IncomePaymentDayType,
        IncomePaymentDay = @IncomePaymentDay
    WHERE BudgetId = @BudgetId;
    """;

        var affected = await conn.ExecuteAsync(sql, new
        {
            BudgetId = budgetId,
            IncomePaymentDayType = incomePaymentDayType,
            IncomePaymentDay = incomePaymentDay
        });

        affected.Should().BeGreaterThan(0);
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
    private static ServiceProvider BuildServiceProvider(
        string cs,
        ITimeProvider clock,
        IDebtPaymentCalculator debtCalc)
    {
        var services = new ServiceCollection();
        var opts = DbOptions(cs);

        services.AddLogging();

        services.AddSingleton<IOptions<DatabaseSettings>>(opts);
        services.AddScoped<IUnitOfWork>(_ => new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance));

        services.AddScoped<IBudgetMonthRepository>(sp =>
            new BudgetMonthRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthDashboardRepository>(sp =>
            new BudgetMonthDashboardRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthDashboardRepository>.Instance,
                opts,
                clock));

        services.AddScoped<IUserRepository>(sp =>
            new UserRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<UserRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthSeedSourceRepository>(sp =>
            new BudgetMonthSeedSourceRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthSeedSourceRepository>.Instance,
                opts));

        services.AddScoped<IBudgetMonthMaterializationRepository>(sp =>
            new BudgetMonthMaterializationRepository(
                (UnitOfWork)sp.GetRequiredService<IUnitOfWork>(),
                NullLogger<BudgetMonthMaterializationRepository>.Instance,
                opts));

        services.AddSingleton<ITimeProvider>(clock);
        services.AddSingleton<IDebtPaymentCalculator>(debtCalc);

        services.AddScoped<IBudgetMonthMaterializer, BudgetMonthMaterializer>();
        services.AddScoped<IBudgetMonthLifecycleService, BudgetMonthLifecycleService>();
        services.AddScoped<IBudgetDashboardProjector>(_ => new BudgetDashboardProjector(debtCalc));

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(GetBudgetDashboardMonthQueryHandler).Assembly);
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>));
        });

        return services.BuildServiceProvider();
    }
}
