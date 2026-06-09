using System;
using System.Linq;
using System.Threading;
using Backend.Infrastructure.Repositories.User;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
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
using Backend.Application.Constants;
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

        var totalSavings = live.Savings?.TotalSavingsMonthly ?? 0m;
        live.Savings?.TotalGoalSavingsMonthly.Should().Be(1500m);

        live.DisposableAfterExpensesWithCarryMonthly
            .Should().Be((32500m - 12000m) + 1000m);

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be((32500m - 12000m - totalSavings) + 1000m);

        var debtPayments = live.Debt.TotalMonthlyPayments;
        var expectedFinal = 32500m - 12000m - totalSavings - debtPayments + 1000m;
        live.FinalBalanceWithCarryMonthly.Should().Be(expectedFinal);
    }

    [Fact]
    public async Task OpenMonth_ReturnsMaterializedFullCarryOver_FromBudgetMonthAmount()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-02",
            status: BudgetMonthStatuses.Open,
            openedAtUtc: new DateTime(2026, 02, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.Full,
            carryOverAmount: 1250m);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        var dto = result.Value!;
        dto.Month.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Full);
        dto.Month.CarryOverAmount.Should().Be(1250m);

        var live = dto.LiveDashboard!;
        live.CarryOverAmountMonthly.Should().Be(1250m);
        live.FinalBalanceWithCarryMonthly.Should().Be(
            live.Income.TotalIncomeMonthly
            - live.Expenditure.TotalExpensesMonthly
            - live.Savings!.TotalSavingsMonthly
            - live.Debt.TotalMonthlyPayments
            + 1250m);
    }

    [Fact]
    public async Task Dashboard_OpenMonth_ReturnsIncomePaymentTiming_FromBudgetMonthIncome()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        await InsertBaselineIncomeAsync(
            _db.ConnectionString,
            budgetId,
            persoid,
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 12);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var income = result.Value!.LiveDashboard!.Income;
        income.IncomePaymentDayType.Should().Be("dayOfMonth");
        income.IncomePaymentDay.Should().Be(12);
    }

    [Fact]
    public async Task Dashboard_DoesNotDependOnBaselineIncomeTiming_AfterMonthMaterialization()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        await InsertBaselineIncomeAsync(
            _db.ConnectionString,
            budgetId,
            persoid,
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 12);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var first = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        first.IsFailure.Should().BeFalse();
        first.Value.Should().NotBeNull();
        first.Value!.LiveDashboard!.Income.IncomePaymentDay.Should().Be(12);

        await UpdateBaselineIncomeTimingAsync(
            _db.ConnectionString,
            budgetId,
            persoid,
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 18);

        var second = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        second.IsFailure.Should().BeFalse();
        second.Value.Should().NotBeNull();

        var income = second.Value!.LiveDashboard!.Income;
        income.IncomePaymentDayType.Should().Be("dayOfMonth");
        income.IncomePaymentDay.Should().Be(12);
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

        dto.Month.IsCloseWindowOpen.Should().BeFalse();
        dto.Month.IsOverdueForClose.Should().BeFalse();
        dto.Month.CloseWindowOpensAtUtc.Should().BeNull();
        dto.Month.CloseEligibleAtUtc.Should().BeNull();
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
    public async Task WhenYearMonthIsNull_UsesExistingOpenMonth()
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

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.Month.YearMonth.Should().Be("2025-12");
        result.Value!.Month.Status.Should().Be("open");
        result.Value!.LiveDashboard.Should().NotBeNull();
        (await CountMonthsForYearMonthAsync(_db.ConnectionString, budgetId, "2026-01"))
            .Should().Be(0);
    }

    [Fact]
    public async Task OpenMonth_AddsGoalMonthlyContributionToTotalSavings_AndSubtractsItFromDisposable()
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

        live.CarryOverAmountMonthly.Should().Be(0m);
        live.Savings.TotalGoalSavingsMonthly.Should().Be(goals);
        live.Savings.TotalSavingsMonthly.Should().Be(MoneyRound.Kr(habit + goals));

        live.DisposableAfterExpensesAndSavingsWithCarryMonthly
            .Should().Be(
                live.Income.TotalIncomeMonthly
                - live.Expenditure.TotalExpensesMonthly
                - live.Savings.TotalSavingsMonthly
                + live.CarryOverAmountMonthly);

        live.Savings.TotalGoalSavingsMonthly.Should().Be(MoneyRound.Kr(live.Savings.TotalGoalSavingsMonthly));
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

        live.Savings.TotalGoalSavingsMonthly.Should().Be(900m);
        // 2500 bassparande + 900 month-specific goal contribution
        live.Savings.TotalSavingsMonthly.Should().Be(3400m);
    }
    [Fact]
    public async Task Handle_WhenOpenMonthInCloseWindow_ReturnsCloseWindowMetadata()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        await SetIncomePaymentTimingAsync(
            _db.ConnectionString,
            budgetId,
            incomePaymentDayType: "dayOfMonth",
            incomePaymentDay: 25);

        var clock = new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-04"),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        var dto = result.Value!;
        dto.Month.Status.Should().Be("open");
        dto.Month.IsCloseWindowOpen.Should().BeTrue();
        dto.Month.IsOverdueForClose.Should().BeFalse();
        dto.Month.CloseWindowOpensAtUtc.Should().Be(new DateTime(2026, 04, 22, 0, 0, 0, DateTimeKind.Utc));
        dto.Month.CloseEligibleAtUtc.Should().Be(new DateTime(2026, 04, 25, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task Handle_WhenNoYearMonthAndOlderOpenMonthExists_DoesNotCreateCurrentMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-04",
            openedAtUtc: new DateTime(2026, 04, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        var clock = new FakeTimeProvider(new DateTime(2026, 05, 01, 08, 0, 0, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, null),
            CancellationToken.None);

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        result.Value!.Month.YearMonth.Should().Be("2026-04");
        result.Value.Month.Status.Should().Be("open");

        (await CountMonthsForYearMonthAsync(_db.ConnectionString, budgetId, "2026-05"))
            .Should().Be(0);
        (await CountOpenMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
    }

    [Fact]
    public async Task OpenMonth_Savings_IsMonthOnlyTrue_WhenSeedHasNoSourceSavingsId()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        var budgetMonthId = await InsertOpenMonthRowAsync(
            _db.ConnectionString,
            budgetId,
            "2026-01",
            new DateTime(2026, 01, 02, 08, 00, 00, DateTimeKind.Utc),
            userId);

        await InsertBudgetMonthSavingsAsync(
            _db.ConnectionString,
            budgetMonthId,
            sourceSavingsId: null,
            monthlySavings: 1500m,
            userId);

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var live = result.Value!.LiveDashboard!;
        live.Savings.Should().NotBeNull();
        live.Savings!.MonthlySavings.Should().Be(1500m);
        live.Savings.IsMonthOnly.Should().BeTrue();
    }

    [Fact]
    public async Task OpenMonth_Savings_IsMonthOnlyFalse_WhenSeedReferencesBaselineSavings()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        var budgetMonthId = await InsertOpenMonthRowAsync(
            _db.ConnectionString,
            budgetId,
            "2026-02",
            new DateTime(2026, 02, 02, 08, 00, 00, DateTimeKind.Utc),
            userId);

        var baselineSavingsId = await GetBaselineSavingsIdAsync(_db.ConnectionString, budgetId);

        await InsertBudgetMonthSavingsAsync(
            _db.ConnectionString,
            budgetMonthId,
            sourceSavingsId: baselineSavingsId,
            monthlySavings: 1500m,
            userId);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-02"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var live = result.Value!.LiveDashboard!;
        live.Savings.Should().NotBeNull();
        live.Savings!.MonthlySavings.Should().Be(1500m);
        live.Savings.IsMonthOnly.Should().BeFalse();
    }

    private static async Task<Guid> InsertOpenMonthRowAsync(
        string cs,
        Guid budgetId,
        string yearMonth,
        DateTime openedAtUtc,
        Guid createdByUserId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        var id = Guid.NewGuid();
        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (Id, BudgetId, YearMonth, Status, OpenedAt, ClosedAt, CarryOverMode, CarryOverAmount, CreatedAt, CreatedByUserId)
            VALUES
            (@Id, @BudgetId, @YearMonth, 'open', @OpenedAt, NULL, 'none', NULL, UTC_TIMESTAMP(), @UserId);
        """, new
        {
            Id = id,
            BudgetId = budgetId,
            YearMonth = yearMonth,
            OpenedAt = openedAtUtc,
            UserId = createdByUserId
        });
        return id;
    }

    private static async Task<Guid> GetBaselineSavingsIdAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<Guid>(
            "SELECT Id FROM Savings WHERE BudgetId = @BudgetId LIMIT 1;",
            new { BudgetId = budgetId });
    }

    private static async Task InsertBudgetMonthSavingsAsync(
        string cs,
        Guid budgetMonthId,
        Guid? sourceSavingsId,
        decimal monthlySavings,
        Guid createdByUserId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonthSavings
            (Id, BudgetMonthId, SourceSavingsId, MonthlySavings, IsOverride, IsDeleted, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @BudgetMonthId, @SourceSavingsId, @MonthlySavings, 0, 0, UTC_TIMESTAMP(), @UserId);
        """, new
        {
            BudgetMonthId = budgetMonthId,
            SourceSavingsId = sourceSavingsId,
            MonthlySavings = monthlySavings,
            UserId = createdByUserId
        });
    }

    // ---- helpers ----
    private static async Task<int> CountOpenMonthsAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)
            FROM BudgetMonth
            WHERE BudgetId = @budgetId
              AND Status = 'open';
            """,
            new { budgetId });
    }

    private static async Task<int> CountMonthsForYearMonthAsync(
        string cs,
        Guid budgetId,
        string yearMonth)
    {
        await using var conn = new MySqlConnection(cs);
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

    private static async Task<Guid> InsertBaselineIncomeAsync(
        string cs,
        Guid budgetId,
        Guid actorPersoid,
        string incomePaymentDayType,
        int? incomePaymentDay,
        decimal netSalaryMonthly = 30000m,
        int salaryFrequency = 0)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        var incomeId = Guid.NewGuid();

        await conn.ExecuteAsync("""
        INSERT INTO Income
        (
            Id,
            BudgetId,
            NetSalaryMonthly,
            SalaryFrequency,
            IncomePaymentDayType,
            IncomePaymentDay,
            CreatedAt,
            CreatedByUserId
        )
        VALUES
        (
            @Id,
            @BudgetId,
            @NetSalaryMonthly,
            @SalaryFrequency,
            @IncomePaymentDayType,
            @IncomePaymentDay,
            UTC_TIMESTAMP(),
            @ActorPersoid
        );
    """, new
        {
            Id = incomeId,
            BudgetId = budgetId,
            NetSalaryMonthly = netSalaryMonthly,
            SalaryFrequency = salaryFrequency,
            IncomePaymentDayType = incomePaymentDayType,
            IncomePaymentDay = incomePaymentDay,
            ActorPersoid = actorPersoid
        });

        return incomeId;
    }

    private static async Task UpdateBaselineIncomeTimingAsync(
        string cs,
        Guid budgetId,
        Guid actorPersoid,
        string incomePaymentDayType,
        int? incomePaymentDay)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
        UPDATE Income
        SET
            IncomePaymentDayType = @IncomePaymentDayType,
            IncomePaymentDay = @IncomePaymentDay,
            UpdatedByUserId = @ActorPersoid
        WHERE BudgetId = @BudgetId;
    ", new
        {
            BudgetId = budgetId,
            IncomePaymentDayType = incomePaymentDayType,
            IncomePaymentDay = incomePaymentDay,
            ActorPersoid = actorPersoid
        });
    }

    [Fact]
    public async Task OpenMonth_TotalExpensesMonthly_IncludesActiveAndCancelledSubs_ExcludesPaused()
    {
        // PR C contract: the dashboard's monthly expense total treats
        // subscription lifecycle as
        //   active     → counts (recurring charge this month)
        //   cancelled  → counts (last charge happens this month)
        //   paused     → excluded (no charge this month)
        // The Quick Edit drawer's footer projection mirrors this rule, so any
        // drift between SQL and the FE projection would lie to the user about
        // what saving will produce on the dashboard.
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        var openedAt = new DateTime(2026, 03, 01, 08, 00, 00, DateTimeKind.Utc);
        await BudgetMonthDsl.InsertOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-03",
            carryOverAmount: 0m,
            createdByUserId: userId,
            openedAtUtc: openedAt);

        await InsertSubscriptionExpenseAsync(
            _db.ConnectionString, budgetId, "2026-03", userId,
            name: "Netflix", amount: 100m,
            lifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Active);
        await InsertSubscriptionExpenseAsync(
            _db.ConnectionString, budgetId, "2026-03", userId,
            name: "Spotify", amount: 50m,
            lifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Paused);
        await InsertSubscriptionExpenseAsync(
            _db.ConnectionString, budgetId, "2026-03", userId,
            name: "HBO", amount: 30m,
            lifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Cancelled);

        var clock = new FakeTimeProvider(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-03"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value!;
        dto.LiveDashboard.Should().NotBeNull();

        // active (100) + cancelled (30) = 130. Paused (50) excluded.
        dto.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(130m);

        // The subscription strip (count, total, items) must mirror the same
        // rule so the dashboard cards do not contradict each other.
        var subs = dto.LiveDashboard!.Subscriptions;
        subs.TotalMonthlyAmount.Should().Be(130m);
        subs.Count.Should().Be(2);
        subs.Items.Select(i => i.Name).Should().BeEquivalentTo(new[] { "Netflix", "HBO" });
    }

    [Fact]
    public async Task OpenMonth_TotalExpensesMonthly_ExcludesUnknownLifecycleValues()
    {
        // v2 hardening (review fix #3): the dashboard SQL switched from
        // `<> 'paused'` to an explicit `IN ('active', 'cancelled')` allowlist
        // precisely so a future or invalid lifecycle value cannot silently
        // count toward the financial total without a deliberate code change.
        //
        // The `BudgetMonthExpenseItem` table already has a CHECK constraint
        // (`CK_BudgetMonthExpenseItem_SubscriptionLifecycleStatus`) that
        // blocks unknown values on writes today. The dashboard SQL
        // allowlist is a defense-in-depth layer for the case where a
        // schema migration adds a new status to the CHECK list (e.g.
        // 'trial' / 'pending') without simultaneously updating the
        // dashboard SQL — without it, the new status would silently
        // affect financial totals.
        //
        // This test drops the CHECK constraint, inserts a row with the
        // unsupported status, asserts the dashboard total excludes it,
        // then leaves the test DB to the next test's `ResetAsync` for
        // cleanup. We do not restore the constraint mid-test because the
        // integration fixture re-applies schema per reset.
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenMonthAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-04",
            carryOverAmount: 0m,
            createdByUserId: userId,
            openedAtUtc: new DateTime(2026, 04, 01, 08, 00, 00, DateTimeKind.Utc));

        // Insert one known-good active sub so we can detect a regression
        // where the allowlist accidentally excludes the supported values.
        await InsertSubscriptionExpenseAsync(
            _db.ConnectionString, budgetId, "2026-04", userId,
            name: "Spotify", amount: 99m,
            lifecycleStatus: BudgetMonthSubscriptionLifecycleStatuses.Active);

        // Drop the CHECK constraint for the duration of this test so we
        // can simulate a future-migration / partial-deploy scenario where
        // an unsupported status string ended up in the column.
        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();
            await conn.ExecuteAsync(
                "ALTER TABLE BudgetMonthExpenseItem DROP CONSTRAINT CK_BudgetMonthExpenseItem_SubscriptionLifecycleStatus;");
        }

        await InsertSubscriptionExpenseAsync(
            _db.ConnectionString, budgetId, "2026-04", userId,
            name: "Mystery Service", amount: 500m,
            lifecycleStatus: "trial");

        var clock = new FakeTimeProvider(new DateTime(2026, 04, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock, new DebtPaymentCalculator());
        await using var scope = sp.CreateAsyncScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var result = await mediator.Send(
            new GetBudgetDashboardMonthQuery(persoid, "2026-04"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value!;

        // Only the active row contributes — the mystery 'trial' row is excluded.
        dto.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(99m);
        dto.LiveDashboard!.Subscriptions.TotalMonthlyAmount.Should().Be(99m);
        dto.LiveDashboard!.Subscriptions.Count.Should().Be(1);
        dto.LiveDashboard!.Subscriptions.Items.Select(i => i.Name)
            .Should().BeEquivalentTo(new[] { "Spotify" });
    }

    private static async Task InsertSubscriptionExpenseAsync(
        string cs,
        Guid budgetId,
        string yearMonth,
        Guid createdByUserId,
        string name,
        decimal amount,
        string lifecycleStatus)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();
        await DbSeeds.EnsureDefaultExpenseCategoriesAsync(conn);

        var budgetMonthId = await conn.QuerySingleAsync<Guid>(
            """
            SELECT Id
            FROM BudgetMonth
            WHERE BudgetId = @BudgetId
              AND YearMonth = @YearMonth
            LIMIT 1;
            """,
            new { BudgetId = budgetId, YearMonth = yearMonth });

        await conn.ExecuteAsync(
            """
            INSERT INTO BudgetMonthExpenseItem
            (
                Id,
                BudgetMonthId,
                SourceExpenseItemId,
                CategoryId,
                Name,
                AmountMonthly,
                SubscriptionLifecycleStatus,
                IsActive,
                IsOverride,
                IsDeleted,
                SortOrder,
                CreatedAt,
                CreatedByUserId
            )
            VALUES
            (
                UUID_TO_BIN(UUID()),
                @BudgetMonthId,
                NULL,
                @CategoryId,
                @Name,
                @AmountMonthly,
                @SubscriptionLifecycleStatus,
                1,
                0,
                0,
                0,
                UTC_TIMESTAMP(),
                @CreatedByUserId
            );
            """,
            new
            {
                BudgetMonthId = budgetMonthId,
                CategoryId = ExpenseCategoryIds.Subscription,
                Name = name,
                AmountMonthly = amount,
                SubscriptionLifecycleStatus = lifecycleStatus,
                CreatedByUserId = createdByUserId
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
        services.AddScoped<IBudgetDashboardProjector>(_ => new BudgetDashboardProjector());

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(GetBudgetDashboardMonthQueryHandler).Assembly);
            cfg.AddOpenBehavior(typeof(UnitOfWorkPipelineBehavior<,>));
        });

        return services.BuildServiceProvider();
    }
}
