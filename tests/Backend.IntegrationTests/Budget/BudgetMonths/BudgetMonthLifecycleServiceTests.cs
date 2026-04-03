using System;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
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
public sealed class BudgetMonthLifecycleServiceTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthLifecycleServiceTests(MariaDbFixture db) => _db = db;

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
    public async Task EnsureAccessibleMonth_WhenNoBudget_ReturnsFailure()
    {
        await _db.ResetAsync();

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid: Guid.NewGuid(),
            actorPersoid: Guid.NewGuid(),
            requestedYearMonth: null,
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeTrue();
        res.Error.Code.Should().Be("Budget.NotFound");
    }

    [Fact]
    public async Task EnsureAccessibleMonth_WhenZeroMonthsAndNoRequestedMonth_BootstrapsCurrentMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(0);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            requestedYearMonth: null,
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();
        res.Value!.YearMonth.Should().Be("2026-01");
        res.Value.WasBootstrapped.Should().BeTrue();
        res.Value.WasCreated.Should().BeFalse(); // bootstrapped current month, then resolved it

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
        (await CountOpenMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
        (await GetOpenYearMonthAsync(_db.ConnectionString, budgetId)).Should().Be("2026-01");

        var (mode, amount) = await GetOpenCarryAsync(_db.ConnectionString, budgetId);
        mode.Should().Be("none");
        amount.Should().BeNull();
    }

    [Fact]
    public async Task EnsureAccessibleMonth_WhenRequestedMonthMissing_CreatesRequestedMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-01",
            openedAtUtc: new DateTime(2026, 01, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            requestedYearMonth: "2026-04",
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();
        res.Value!.YearMonth.Should().Be("2026-04");
        res.Value.WasBootstrapped.Should().BeFalse();
        res.Value.WasCreated.Should().BeTrue();

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(2);
    }

    [Fact]
    public async Task EnsureAccessibleMonth_WhenRequestedMonthAlreadyExists_DoesNotDuplicate()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertOpenAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            ym: "2026-04",
            openedAtUtc: new DateTime(2026, 04, 01, 10, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId);

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            requestedYearMonth: "2026-04",
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();
        res.Value!.YearMonth.Should().Be("2026-04");
        res.Value.WasBootstrapped.Should().BeFalse();
        res.Value.WasCreated.Should().BeFalse();

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(1);
    }
    [Fact]
    public async Task EnsureAccessibleMonth_WhenZeroMonthsAndExplicitFutureMonth_CreatesBootstrapAndRequestedMonth()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;
        var budgetId = seed.BudgetId;

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            requestedYearMonth: "2026-04",
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeFalse();
        res.Value.Should().NotBeNull();
        res.Value!.YearMonth.Should().Be("2026-04");
        res.Value.WasBootstrapped.Should().BeTrue();
        res.Value.WasCreated.Should().BeTrue();

        (await CountMonthsAsync(_db.ConnectionString, budgetId)).Should().Be(2);
    }

    [Fact]
    public async Task EnsureAccessibleMonth_WhenRequestedYearMonthInvalid_ReturnsFailure()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var persoid = seed.Persoid;

        ITimeProvider clock = new FakeTimeProvider(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var service = BuildService(_db.ConnectionString, clock, out var uow);

        await uow.BeginTransactionAsync(CancellationToken.None);
        var res = await service.EnsureAccessibleMonthAsync(
            persoid,
            persoid,
            requestedYearMonth: "2026-13",
            ct: CancellationToken.None);
        await uow.CommitAsync(CancellationToken.None);

        res.IsFailure.Should().BeTrue();
        res.Error.Code.Should().Be("BudgetMonth.InvalidYearMonth");
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }
}