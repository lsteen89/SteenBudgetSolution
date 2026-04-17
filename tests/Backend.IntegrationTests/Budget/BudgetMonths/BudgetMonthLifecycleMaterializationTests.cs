using System;
using System.Threading;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Common.Behaviors;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class BudgetMonthLifecycleMaterializationTests
{
    private readonly MariaDbFixture _db;
    public BudgetMonthLifecycleMaterializationTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenNoMonthsExist_BootstrapsCurrentMonth_AndMaterializesChildRows()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.YearMonth.Should().Be("2026-02");
        result.Value.WasBootstrapped.Should().BeTrue();
        result.Value.WasCreated.Should().BeFalse();
        result.Value.WasMaterialized.Should().BeTrue();

        var budgetMonthIncomeId = await GetBudgetMonthIncomeIdAsync(_db.ConnectionString, result.Value.BudgetMonthId);
        budgetMonthIncomeId.Should().NotBeNull();

        var expenseCount = await CountBudgetMonthExpenseRowsAsync(_db.ConnectionString, result.Value.BudgetMonthId);
        expenseCount.Should().BeGreaterThan(0);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenBaselineSavingsExists_SeedsBudgetMonthSavings()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.WasMaterialized.Should().BeTrue();

        var savings = await GetBudgetMonthSavingsAsync(_db.ConnectionString, result.Value.BudgetMonthId);

        savings.Should().NotBeNull();
        savings!.SourceSavingsId.Should().NotBeNull();
        savings.MonthlySavings.Should().BeGreaterThan(0m);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenBaselineSavingsMissing_CreatesZeroedBudgetMonthSavingsRoot()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.WasMaterialized.Should().BeTrue();

        var savings = await GetBudgetMonthSavingsAsync(_db.ConnectionString, result.Value.BudgetMonthId);

        savings.Should().NotBeNull();
        savings!.SourceSavingsId.Should().BeNull();
        savings.MonthlySavings.Should().Be(0m);
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenBaselineSavingsGoalsExist_SeedsBudgetMonthSavingsGoals()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var goalsCount = await CountBudgetMonthSavingsGoalsAsync(_db.ConnectionString, result.Value!.BudgetMonthId);
        goalsCount.Should().BeGreaterThan(0);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenBaselineDebtsExist_SeedsBudgetMonthDebts()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var debtCount = await CountBudgetMonthDebtRowsAsync(_db.ConnectionString, result.Value!.BudgetMonthId);
        debtCount.Should().BeGreaterThan(0);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenSavingsGoalIsClosed_DoesNotSeedClosedSavingsGoal()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        await CloseAllSavingsGoalsAsync(_db.ConnectionString, budgetId, persoid);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var goalsCount = await CountBudgetMonthSavingsGoalsAsync(_db.ConnectionString, result.Value!.BudgetMonthId);
        goalsCount.Should().Be(0);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_PreservesSourceSavingsGoalId_WhenSavingsGoalsSeed()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        var sourceGoalIds = await GetBaselineSavingsGoalIdsAsync(_db.ConnectionString, budgetId);
        sourceGoalIds.Should().NotBeEmpty();

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var materializedSourceGoalIds = await GetBudgetMonthSavingsGoalSourceIdsAsync(
            _db.ConnectionString,
            result.Value!.BudgetMonthId);

        materializedSourceGoalIds.Should().BeEquivalentTo(sourceGoalIds);
    }
    [Fact]
    public async Task MaterializeIfMissingAsync_WhenCalledTwice_DoesNotDuplicateSavingsGoals_AndPreservesMonthlyContribution()
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
            var goalId = Guid.NewGuid();

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
            (@Id, @SavingsId, 'Emergency fund', 50000, '2026-12-31', 10000, 1200, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = goalId,
                SavingsId = savingsId,
                UserId = userId
            });
        }

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-02",
            status: "open",
            openedAtUtc: new DateTime(2026, 02, 01, 8, 0, 0, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: "none",
            carryOverAmount: null);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 02, 07, 8, 0, 0, DateTimeKind.Utc));

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, time);

        var openMonth = await monthsRepo.GetByBudgetIdAndYearMonthAsync(
            budgetId,
            "2026-02",
            CancellationToken.None);

        openMonth.Should().NotBeNull();

        var first = await uow.InTx(CancellationToken.None, () =>
            materializer.MaterializeIfMissingAsync(
                budgetId,
                openMonth!.Id,
                persoid,
                CancellationToken.None));

        first.IsSuccess.Should().BeTrue();

        var second = await uow.InTx(CancellationToken.None, () =>
            materializer.MaterializeIfMissingAsync(
                budgetId,
                openMonth!.Id,
                persoid,
                CancellationToken.None));

        second.IsSuccess.Should().BeTrue();

        await using var verifyConn = new MySqlConnection(_db.ConnectionString);
        await verifyConn.OpenAsync();

        var rows = (await verifyConn.QueryAsync<(decimal MonthlyContribution, Guid? SourceSavingsGoalId)>(@"
        SELECT
            g.MonthlyContribution,
            g.SourceSavingsGoalId
        FROM BudgetMonthSavingsGoal g
        INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
        WHERE s.BudgetMonthId = @BudgetMonthId
          AND g.Name = 'Emergency fund';
    ", new { BudgetMonthId = openMonth!.Id })).ToList();

        rows.Should().HaveCount(1);
        rows[0].MonthlyContribution.Should().Be(1200m);
        rows[0].SourceSavingsGoalId.Should().NotBeNull();
    }
    [Fact]
    public async Task MaterializeIfMissingAsync_WhenCalledTwice_DoesNotDuplicateSavingsGoals()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var first = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        first.IsFailure.Should().BeFalse();

        var firstGoalCount = await CountBudgetMonthSavingsGoalsAsync(_db.ConnectionString, first.Value!.BudgetMonthId);

        var second = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        second.IsFailure.Should().BeFalse();

        var secondGoalCount = await CountBudgetMonthSavingsGoalsAsync(_db.ConnectionString, second.Value!.BudgetMonthId);

        second.Value!.BudgetMonthId.Should().Be(first.Value!.BudgetMonthId);
        secondGoalCount.Should().Be(firstGoalCount);
    }
    [Fact]
    public async Task EnsureAccessibleMonthAsync_WhenDebtIsClosed_DoesNotSeedClosedDebt()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        await CloseAllDebtsAsync(_db.ConnectionString, budgetId, persoid);

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var result = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var debtCount = await CountBudgetMonthDebtRowsAsync(_db.ConnectionString, result.Value!.BudgetMonthId);
        debtCount.Should().Be(0);
    }
    [Fact]
    public async Task MaterializeIfMissingAsync_WhenCalledTwice_DoesNotDuplicateDebts()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var clock = new FakeTimeProvider(new DateTime(2026, 02, 07, 08, 00, 00, DateTimeKind.Utc));

        await using var sp = BuildServiceProvider(_db.ConnectionString, clock);
        await using var scope = sp.CreateAsyncScope();

        var lifecycle = scope.ServiceProvider.GetRequiredService<IBudgetMonthLifecycleService>();
        var uow = (UnitOfWork)scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var first = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        first.IsFailure.Should().BeFalse();

        var firstDebtCount = await CountBudgetMonthDebtRowsAsync(_db.ConnectionString, first.Value!.BudgetMonthId);

        var second = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(
                persoid,
                persoid,
                "2026-02",
                CancellationToken.None));

        second.IsFailure.Should().BeFalse();

        var secondDebtCount = await CountBudgetMonthDebtRowsAsync(_db.ConnectionString, second.Value!.BudgetMonthId);

        second.Value!.BudgetMonthId.Should().Be(first.Value!.BudgetMonthId);
        secondDebtCount.Should().Be(firstDebtCount);
    }
    [Fact]
    public async Task MonthSavingsGoalContribution_IsMaterializedCorrectly()
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
            (@Id, @SavingsId, 'Emergency fund', 50000, '2026-12-31', 10000, 1200, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = Guid.NewGuid(),
                SavingsId = savingsId,
                UserId = userId
            });
        }

        var dbOpts = DbOptions(_db.ConnectionString);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 02, 07, 8, 0, 0, DateTimeKind.Utc));
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, time);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var res = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-02", CancellationToken.None));

        res.IsSuccess.Should().BeTrue();
        var budgetMonthId = res.Value!.BudgetMonthId;

        await using var verifyConn = new MySqlConnection(_db.ConnectionString);
        await verifyConn.OpenAsync();

        var row = await verifyConn.QuerySingleAsync<(decimal MonthlyContribution, int Count)>(@"
        SELECT g.MonthlyContribution, COUNT(*) OVER() AS Count
        FROM BudgetMonthSavingsGoal g
        INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
        WHERE s.BudgetMonthId = @BudgetMonthId
          AND g.Name = 'Emergency fund';
    ", new { BudgetMonthId = budgetMonthId });

        row.MonthlyContribution.Should().Be(1200m);
        row.Count.Should().Be(1);
    }
    [Fact]
    public async Task BaselineRemainsUnchanged_WhenMonthContributionDiffers()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        Guid savingsId;
        Guid budgetMonthId;

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            savingsId = Guid.NewGuid();

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
                Id = Guid.NewGuid(),
                SavingsId = savingsId,
                UserId = userId
            });
        }

        var dbOpts = DbOptions(_db.ConnectionString);
        ITimeProvider time = new FakeTimeProvider(new DateTime(2026, 02, 07, 8, 0, 0, DateTimeKind.Utc));
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, time);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var ensure = await uow.InTx(CancellationToken.None, () =>
            lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-02", CancellationToken.None));

        ensure.IsSuccess.Should().BeTrue();
        budgetMonthId = ensure.Value!.BudgetMonthId;

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

        await using var verifyConn = new MySqlConnection(_db.ConnectionString);
        await verifyConn.OpenAsync();

        var baselineContribution = await verifyConn.ExecuteScalarAsync<decimal>(@"
        SELECT g.MonthlyContribution
        FROM SavingsGoal g
        INNER JOIN Savings s ON s.Id = g.SavingsId
        WHERE s.BudgetId = @BudgetId
          AND g.Name = 'Emergency fund'
        LIMIT 1;
    ", new { BudgetId = budgetId });

        var monthContribution = await verifyConn.ExecuteScalarAsync<decimal>(@"
        SELECT g.MonthlyContribution
        FROM BudgetMonthSavingsGoal g
        INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
        WHERE s.BudgetMonthId = @BudgetMonthId
          AND g.Name = 'Emergency fund'
        LIMIT 1;
    ", new { BudgetMonthId = budgetMonthId });

        baselineContribution.Should().Be(500m);
        monthContribution.Should().Be(900m);
    }
    private static async Task<List<Guid>> GetBaselineSavingsGoalIdsAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<Guid>(@"
        SELECT sg.Id
        FROM SavingsGoal sg
        INNER JOIN Savings s ON s.Id = sg.SavingsId
        WHERE s.BudgetId = @BudgetId
          AND sg.Status = 'active'
        ORDER BY sg.CreatedAt, sg.Id;
    ", new { BudgetId = budgetId });

        return rows.ToList();
    }
    private static async Task<List<Guid>> GetBudgetMonthSavingsGoalSourceIdsAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<Guid>(@"
        SELECT g.SourceSavingsGoalId
        FROM BudgetMonthSavingsGoal g
        INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
        WHERE s.BudgetMonthId = @BudgetMonthId
          AND g.SourceSavingsGoalId IS NOT NULL
        ORDER BY g.SortOrder, g.Id;
    ", new { BudgetMonthId = budgetMonthId });

        return rows.ToList();
    }
    private static async Task CloseAllSavingsGoalsAsync(string cs, Guid budgetId, Guid actorPersoid)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
        UPDATE SavingsGoal sg
        INNER JOIN Savings s ON s.Id = sg.SavingsId
        SET
            sg.Status = 'closed',
            sg.ClosedAt = UTC_TIMESTAMP(),
            sg.ClosedReason = 'test',
            sg.UpdatedByUserId = @ActorPersoid
        WHERE s.BudgetId = @BudgetId;
    ", new
        {
            BudgetId = budgetId,
            ActorPersoid = actorPersoid
        });
    }

    private static async Task CloseAllDebtsAsync(string cs, Guid budgetId, Guid actorPersoid)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
        UPDATE Debt
        SET
            Status = 'closed',
            ClosedAt = UTC_TIMESTAMP(),
            ClosedReason = 'test',
            UpdatedByUserId = @ActorPersoid
        WHERE BudgetId = @BudgetId;
    ", new
        {
            BudgetId = budgetId,
            ActorPersoid = actorPersoid
        });
    }
    private sealed record BudgetMonthSavingsRow(Guid? SourceSavingsId, decimal MonthlySavings);

    private static async Task<BudgetMonthSavingsRow?> GetBudgetMonthSavingsAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<BudgetMonthSavingsRow>(@"
        SELECT
            SourceSavingsId,
            MonthlySavings
        FROM BudgetMonthSavings
        WHERE BudgetMonthId = @BudgetMonthId
        LIMIT 1;
    ", new { BudgetMonthId = budgetMonthId });
    }
    private static async Task<int> CountBudgetMonthSavingsGoalsAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonthSavingsGoal g
        INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
        WHERE s.BudgetMonthId = @BudgetMonthId;
    ", new { BudgetMonthId = budgetMonthId });
    }
    private static async Task<int> CountBudgetMonthDebtRowsAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonthDebt
        WHERE BudgetMonthId = @BudgetMonthId;
    ", new { BudgetMonthId = budgetMonthId });
    }

    private static ServiceProvider BuildServiceProvider(string cs, ITimeProvider clock)
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
        services.AddScoped<IBudgetMonthMaterializer, BudgetMonthMaterializer>();
        services.AddScoped<IBudgetMonthLifecycleService, BudgetMonthLifecycleService>();

        return services.BuildServiceProvider();
    }
    private static async Task<Guid?> GetBudgetMonthIncomeIdAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<Guid?>(@"
        SELECT Id
        FROM BudgetMonthIncome
        WHERE BudgetMonthId = @BudgetMonthId
        LIMIT 1;
    ", new { BudgetMonthId = budgetMonthId });
    }

    private static async Task<int> CountBudgetMonthExpenseRowsAsync(string cs, Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonthExpenseItem
        WHERE BudgetMonthId = @BudgetMonthId;
    ", new { BudgetMonthId = budgetMonthId });
    }
}