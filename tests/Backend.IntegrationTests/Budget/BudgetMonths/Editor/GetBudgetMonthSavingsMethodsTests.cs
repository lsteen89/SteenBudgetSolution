using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsMethods;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

[Collection("it:db")]
public sealed class GetBudgetMonthSavingsMethodsTests
{
    private readonly MariaDbFixture _db;

    public GetBudgetMonthSavingsMethodsTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs)
        => Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    [Fact]
    public async Task ReturnsEmpty_WhenNoMethodsSeeded()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var methods = await GetMethodsAsync(sut, seed.Persoid);

        methods.Should().BeEmpty();
    }

    [Fact]
    public async Task ReturnsSystemMethods_WithIdAndCode()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        await InsertSystemMethodsAsync(seed.Persoid, "savings_account", "isk", "cash");

        var methods = await GetMethodsAsync(sut, seed.Persoid);

        methods.Should().HaveCount(3);
        methods.Select(m => m.Code).Should().BeEquivalentTo(
            new[] { "cash", "isk", "savings_account" },
            options => options.WithStrictOrdering());
        methods.Should().OnlyContain(m => m.Id != Guid.Empty);
        methods.Should().OnlyContain(m => m.CustomLabel == null);
    }

    [Fact]
    public async Task ReturnsCustomMethods_WithLabel()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        await InsertSystemMethodsAsync(seed.Persoid, "isk");
        await InsertCustomMethodAsync(seed.Persoid, "Premiepension");
        await InsertCustomMethodAsync(seed.Persoid, "Avanza ISK");

        var methods = await GetMethodsAsync(sut, seed.Persoid);

        methods.Should().HaveCount(3);
        // System rows come first, custom rows last (alphabetical by label).
        methods[0].Code.Should().Be("isk");
        methods[0].CustomLabel.Should().BeNull();
        methods[1].Code.Should().Be("custom");
        methods[1].CustomLabel.Should().Be("Avanza ISK");
        methods[2].Code.Should().Be("custom");
        methods[2].CustomLabel.Should().Be("Premiepension");
    }

    // Cross-budget isolation: another user's methods must not appear in this
    // user's result set even though both rows live in the same SavingsMethod
    // table. This is the kind of leak the budget-scoped JOIN exists to
    // prevent — keep it pinned.
    [Fact]
    public async Task DoesNotLeakMethodsFromOtherBudget()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var otherSeed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        await EnsureMonthAsync(sut, otherSeed.Persoid);

        await InsertSystemMethodsAsync(seed.Persoid, "isk");
        await InsertSystemMethodsAsync(otherSeed.Persoid, "savings_account", "cash");

        var methods = await GetMethodsAsync(sut, seed.Persoid);

        methods.Should().ContainSingle().Which.Code.Should().Be("isk");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-03", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<SavingsMethodDto>> GetMethodsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Handler.Handle(
                new GetBudgetMonthSavingsMethodsQuery(persoid, "2026-03"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<Guid> GetSavingsIdAsync(Guid persoid)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<Guid>("""
            SELECT s.Id
            FROM Savings s
            JOIN Budget b ON b.Id = s.BudgetId
            WHERE b.Persoid = @persoid
            LIMIT 1;
        """, new { persoid });
    }

    private async Task InsertSystemMethodsAsync(Guid persoid, params string[] codes)
    {
        var savingsId = await GetSavingsIdAsync(persoid);

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        foreach (var code in codes)
        {
            await conn.ExecuteAsync("""
                INSERT INTO SavingsMethod
                    (Id, SavingsId, MethodCode, CustomLabel, CreatedAt, CreatedByUserId)
                VALUES
                    (UUID_TO_BIN(UUID()), @savingsId, @code, NULL, UTC_TIMESTAMP(), @persoid);
            """, new { savingsId, code, persoid });
        }
    }

    private async Task InsertCustomMethodAsync(Guid persoid, string label)
    {
        var savingsId = await GetSavingsIdAsync(persoid);

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO SavingsMethod
                (Id, SavingsId, MethodCode, CustomLabel, CreatedAt, CreatedByUserId)
            VALUES
                (UUID_TO_BIN(UUID()), @savingsId, 'custom', @label, UTC_TIMESTAMP(), @persoid);
        """, new { savingsId, label, persoid });
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);

        var monthsRepo = new BudgetMonthRepository(
            uow,
            NullLogger<BudgetMonthRepository>.Instance,
            dbOpts);

        var seedSourceRepo = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            dbOpts);

        var materializer = new BudgetMonthMaterializer(
            seedSourceRepo,
            materializationRepo,
            time);

        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var savingsRepo = new BudgetMonthSavingsGoalMutationRepository(
            uow,
            NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            Handler = new GetBudgetMonthSavingsMethodsQueryHandler(
                lifecycle,
                savingsRepo,
                NullLogger<GetBudgetMonthSavingsMethodsQueryHandler>.Instance),
        };
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsMethodsQueryHandler Handler { get; init; }
    }
}
