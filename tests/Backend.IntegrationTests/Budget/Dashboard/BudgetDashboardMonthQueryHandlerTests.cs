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
using Backend.Application.BudgetMonths.Services;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Backend.Application.Common.Behaviors;
using Backend.Application.Services.Budget.Materializer;

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

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
            CancellationToken.None);

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

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2025-12"),
            CancellationToken.None);

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

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-1"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(BudgetMonth.InvalidYearMonth.Code);
    }
    [Fact]
    public async Task WhenYearMonthIsNull_PicksCurrentYearMonth_AndEnsuresIt()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        // Existing open month in the past should not win anymore
        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2025-12",
            openedAtUtc: new DateTime(2025, 12, 15, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.Month.YearMonth.Should().Be("2026-01");
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
        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, spy);
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();

        spy.CallCount.Should().Be(2);
        spy.SeenTypes.Should().BeEquivalentTo(new[] { "revolving", "installment" });

        var live = result.Value!.LiveDashboard!;
        live.Debt.Debts.Should().HaveCount(2);
        live.Debt.Debts.Should().OnlyContain(d => d.MonthlyPayment == 123m);
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
        var monthlyContribution = 200m;

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
            (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @sid, 'TestGoal', @ta, @td, @as, @mc, UTC_TIMESTAMP(), @uid);
        ", new
            {
                sid = savingsId,
                ta = targetAmount,
                td = targetDate,
                @as = amountSaved,
                mc = monthlyContribution,
                uid = userId
            });
        }

        var clock = new FakeTimeProvider(now);

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
            CancellationToken.None);
        result.IsFailure.Should().BeFalse();

        var live = result.Value!.LiveDashboard!;
        live.Savings.Should().NotBeNull();

        var goal = live.Savings!.Goals.Single(g => g.Name == "TestGoal");
        goal.MonthlyContribution.Should().Be(monthlyContribution);

        var habit = live.Savings.MonthlySavings;
        var goals = live.Savings.Goals.Sum(g => g.MonthlyContribution);
        var totalSavings = habit + goals;

        live.CarryOverAmountMonthly.Should().Be(0m);

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be(
                live.Income.TotalIncomeMonthly
                - live.Expenditure.TotalExpensesMonthly
                - totalSavings
                + live.CarryOverAmountMonthly);

        totalSavings.Should().Be(MoneyRound.Kr(totalSavings));
    }
    [Fact]
    public async Task OpenMonthDashboard_UsesMonthContribution_NotBaselineContribution()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        Guid budgetMonthId;

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var savingsId = Guid.NewGuid();
            var baselineGoalId = Guid.NewGuid();

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
            (@Id, @SavingsId, 'Emergency fund', 50000, '2026-12-31', 10000, 500, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = baselineGoalId,
                SavingsId = savingsId,
                UserId = userId
            });
        }

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 8, 0, 0, DateTimeKind.Utc));
        await using (var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator()))
        await using (var scope = sp.CreateAsyncScope())
        {
            var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
            var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

            var ensure = await uow.InTx(CancellationToken.None, () =>
                lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-02", CancellationToken.None));

            ensure.IsSuccess.Should().BeTrue();
            budgetMonthId = ensure.Value!.BudgetMonthId;
        }

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            await conn.ExecuteAsync(@"
            UPDATE BudgetMonthSavingsGoal g
            INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            SET g.MonthlyContribution = 900
            WHERE s.BudgetMonthId = @BudgetMonthId
              AND g.Name = 'Emergency fund';
        ", new { BudgetMonthId = budgetMonthId });
        }

        await using var sp2 = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope2 = sp2.CreateAsyncScope();
        var mediator = scope2.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var live = result.Value!.LiveDashboard!;
        var goal = live.Savings!.Goals.Single(g => g.Name == "Emergency fund");

        goal.MonthlyContribution.Should().Be(900m);
        goal.MonthlyContribution.Should().NotBe(500m);

        var totalSavings = live.Savings.MonthlySavings + live.Savings.Goals.Sum(g => g.MonthlyContribution);
        totalSavings.Should().Be(3400m); // 2500 + 900
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
    private static ServiceProvider BuildServiceProvider(
        string cs,
        ITimeProvider clock,
        IDebtPaymentCalculator debtCalc)
    {
        var services = new ServiceCollection();
        var opts = DbOptions(cs);

        services.AddLogging();

        services.AddSingleton<IOptions<DatabaseSettings>>(opts);

        services.AddScoped<IUnitOfWork>(_ =>
            new UnitOfWork(opts, NullLogger<UnitOfWork>.Instance));

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
