using System;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Months.EnsureFirstBudgetMonth;
using Backend.Application.Services.Budget;
using Backend.IntegrationTests.Shared;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;
using Backend.Infrastructure.Repositories.Budget.Months;      // <-- adjust if your BudgetMonthRepository lives elsewhere

namespace Backend.IntegrationTests.BudgetMonths;

[Collection("it:db")]
public sealed class EnsureFirstBudgetMonthCommandTests
{
    private readonly MariaDbFixture _db;

    public EnsureFirstBudgetMonthCommandTests(MariaDbFixture db) => _db = db;

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

    private static async Task InsertOpenMonthAsync(string cs, Guid budgetId, string ym, Guid createdByPersoid)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO BudgetMonth
            (Id, BudgetId, YearMonth, Status, OpenedAt, CarryOverMode, CarryOverAmount, CreatedAt, CreatedByUserId)
            VALUES
            (UUID_TO_BIN(UUID()), @bid, @ym, 'open', UTC_TIMESTAMP(), 'none', NULL, UTC_TIMESTAMP(), @pid);
        """, new { bid = budgetId, ym, pid = createdByPersoid });
    }

    [Fact]
    public async Task EnsureFirstMonth_WhenNoBudget_ReturnsSuccess()
    {
        await _db.ResetAsync();

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        IBudgetMonthBootstrapper bootstrapper = new BudgetMonthBootstrapper(repo, clock);
        var handler = new EnsureFirstBudgetMonthCommandHandler(bootstrapper);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await handler.Handle(
            new EnsureFirstBudgetMonthCommand(
                Persoid: Guid.NewGuid(),
                ActorPersoid: Guid.NewGuid()),
            CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
    }

    [Fact]
    public async Task EnsureFirstMonth_WhenZeroMonths_CreatesCurrentOpenMonth()
    {
        await _db.ResetAsync();

        var (persoid, _, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(0);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        IBudgetMonthBootstrapper bootstrapper = new BudgetMonthBootstrapper(repo, clock);
        var handler = new EnsureFirstBudgetMonthCommandHandler(bootstrapper);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await handler.Handle(new EnsureFirstBudgetMonthCommand(persoid, persoid), CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
        (await CountOpenMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);

        (await GetOpenYearMonthAsync(_db.ConnectionString, budgetId)).Should().Be("2026-01");

        var (mode, amount) = await GetOpenCarryAsync(_db.ConnectionString, budgetId);
        mode.Should().Be("none");
        amount.Should().BeNull(); // matches "none" mode constraints
    }

    [Fact]
    public async Task EnsureFirstMonth_WhenMonthsAlreadyExist_DoesNothing()
    {
        await _db.ResetAsync();

        var (persoid, _, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        await InsertOpenMonthAsync(_db.ConnectionString, budgetId, "2025-12", createdByPersoid: persoid);
        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        IBudgetMonthBootstrapper bootstrapper = new BudgetMonthBootstrapper(repo, clock);
        var handler = new EnsureFirstBudgetMonthCommandHandler(bootstrapper);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await handler.Handle(new EnsureFirstBudgetMonthCommand(persoid, persoid), CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
    }

    [Fact]
    public async Task EnsureFirstMonth_IsIdempotent_WhenCalledTwice()
    {
        await _db.ResetAsync();

        var (persoid, _, budgetId) = await BudgetSeeds.SeedMinimalAsync(_db.ConnectionString);

        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        var repo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        IBudgetMonthBootstrapper bootstrapper = new BudgetMonthBootstrapper(repo, clock);
        var handler = new EnsureFirstBudgetMonthCommandHandler(bootstrapper);

        // Call #1
        await uow.BeginTransactionAsync(CancellationToken.None);
        (await handler.Handle(new EnsureFirstBudgetMonthCommand(persoid, persoid), CancellationToken.None))
            .IsFailure.Should().BeFalse();
        await uow.CommitAsync(CancellationToken.None);

        // Call #2
        await uow.BeginTransactionAsync(CancellationToken.None);
        (await handler.Handle(new EnsureFirstBudgetMonthCommand(persoid, persoid), CancellationToken.None))
            .IsFailure.Should().BeFalse();
        await uow.CommitAsync(CancellationToken.None);

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
        (await CountOpenMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
        (await GetOpenYearMonthAsync(_db.ConnectionString, budgetId)).Should().Be("2026-01");
    }
}
