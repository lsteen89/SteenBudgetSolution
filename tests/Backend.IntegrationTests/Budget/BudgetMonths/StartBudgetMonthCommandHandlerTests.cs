using System;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Debts;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Audit;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Application.Services.Budget.Materializer;

namespace Backend.IntegrationTests.BudgetMonths;

[Collection("it:db")]
public sealed class StartBudgetMonthCommandHandlerTests
{
    private readonly MariaDbFixture _db;

    public StartBudgetMonthCommandHandlerTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    private static async Task<int> CountMonthsAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*)
            FROM BudgetMonth
            WHERE BudgetId = @bid;
        ", new { bid = budgetId });
    }

    private static async Task<int> CountOpenMonthsAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*)
            FROM BudgetMonth
            WHERE BudgetId = @bid
              AND Status = 'open';
        ", new { bid = budgetId });
    }

    private static async Task<string?> GetOpenYearMonthAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<string?>(@"
            SELECT YearMonth
            FROM BudgetMonth
            WHERE BudgetId = @bid
              AND Status = 'open'
            ORDER BY OpenedAt DESC
            LIMIT 1;
        ", new { bid = budgetId });
    }

    private static async Task<(string? Mode, decimal? Amount)> GetOpenCarryAsync(string cs, Guid budgetId)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        var row = await conn.QuerySingleOrDefaultAsync<(string CarryOverMode, decimal? CarryOverAmount)>(@"
            SELECT CarryOverMode, CarryOverAmount
            FROM BudgetMonth
            WHERE BudgetId = @bid
              AND Status = 'open'
            LIMIT 1;
        ", new { bid = budgetId });

        return row == default ? (null, null) : (row.CarryOverMode, row.CarryOverAmount);
    }

    private static BudgetMonthLifecycleService BuildService(
        string cs,
        ITimeProvider clock,
        out UnitOfWork uow)
    {
        var dbOpts = DbOptions(cs);
        uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var repo = new BudgetMonthRepository(
            uow,
            NullLogger<BudgetMonthRepository>.Instance,
            dbOpts);
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);

        return new BudgetMonthLifecycleService(repo, materializer, clock);
    }


    [Fact]
    public async Task CloseMonthSnapshot_UsesMonthGoalContribution()
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
            (@Id, @SavingsId, 'Emergency fund', 50000, '2026-12-31', 10000, 500, UTC_TIMESTAMP(), @UserId);
        """, new
            {
                Id = Guid.NewGuid(),
                SavingsId = savingsId,
                UserId = userId
            });
        }

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-01",
            status: "open",
            openedAtUtc: new DateTime(2026, 01, 01, 10, 0, 0, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: null,
            carryOverMode: "none",
            carryOverAmount: null);

        var clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 8, 0, 0, DateTimeKind.Utc));
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var monthDashRepo = new BudgetMonthDashboardRepository(uow, NullLogger<BudgetMonthDashboardRepository>.Instance, dbOpts, clock);
        var calc = new DebtPaymentCalculator();
        var totalsSvc = new BudgetMonthlyTotalsService(monthDashRepo, calc);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totalsSvc);
        var auditWriter = new BudgetAuditWriter(uow, NullLogger<BudgetAuditWriter>.Instance, dbOpts);

        // materialize first
        var seedSource = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);

        var openMonth = await monthsRepo.GetByBudgetIdAndYearMonthAsync(
            budgetId,
            "2026-01",
            CancellationToken.None);

        openMonth.Should().NotBeNull();

        var materialized = await uow.InTx(CancellationToken.None, () =>
            materializer.MaterializeIfMissingAsync(
                budgetId,
                openMonth!.Id,
                persoid,
                CancellationToken.None));

        materialized.IsSuccess.Should().BeTrue();

        await using (var conn = new MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            await conn.ExecuteAsync(@"
            UPDATE BudgetMonthSavingsGoal g
            INNER JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            SET g.MonthlyContribution = 900
            WHERE s.BudgetMonthId = @BudgetMonthId
              AND g.Name = 'Emergency fund';
        ", new { BudgetMonthId = openMonth.Id });
        }

        var handler = new StartBudgetMonthCommandHandler(
            months: monthsRepo,
            closeSnapshot: closeSnapshot,
            totals: totalsSvc,
            audit: auditWriter,
            time: clock,
            log: NullLogger<StartBudgetMonthCommandHandler>.Instance);

        var req = new StartBudgetMonthRequestDto(
            TargetYearMonth: "2026-02",
            ClosePreviousOpenMonth: true,
            CarryOverMode: BudgetMonthCarryOverModes.None,
            CarryOverAmount: null,
            CreateSkippedMonths: true);

        var result = await uow.InTx(CancellationToken.None, () =>
            handler.Handle(new StartBudgetMonthCommand(persoid, userId, req), CancellationToken.None));

        result.IsSuccess.Should().BeTrue();

        await using var verifyConn = new MySqlConnection(_db.ConnectionString);
        await verifyConn.OpenAsync();

        var snapshotSavings = await verifyConn.ExecuteScalarAsync<decimal>(@"
        SELECT SnapshotTotalSavingsMonthly
        FROM BudgetMonth
        WHERE BudgetId = @BudgetId
          AND YearMonth = '2026-01'
        LIMIT 1;
    ", new { BudgetId = budgetId });

        snapshotSavings.Should().Be(3400m); // 2500 + 900
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }
}
