using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.AddSavingsMethod;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsMethods;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsMethod;
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
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

// Covers the AddSavingsMethod and RemoveSavingsMethod slices end-to-end:
// happy paths for system + custom codes, the idempotent re-add behavior,
// the case-insensitive custom-label de-dupe, removal scoping (a stray id
// from another user must not remove anything), and idempotent removal of a
// row that no longer exists. We hit real SQL through the same repo the
// production handler uses so the DB CHECK / UNIQUE constraints get exercised
// alongside the C# handler logic.
[Collection("it:db")]
public sealed class SavingsMethodWriteTests
{
    private readonly MariaDbFixture _db;

    public SavingsMethodWriteTests(MariaDbFixture db) => _db = db;

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
    public async Task Add_InsertsSystemCodeAndReturnsRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var added = await AddAsync(sut, seed.Persoid, code: "isk");

        added.Should().NotBeNull();
        added!.Code.Should().Be("isk");
        added.CustomLabel.Should().BeNull();
        added.Id.Should().NotBe(Guid.Empty);

        var methods = await GetMethodsAsync(sut, seed.Persoid);
        methods.Should().ContainSingle(m => m.Id == added.Id && m.Code == "isk");
    }

    [Fact]
    public async Task Add_InsertsCustomRowWithTrimmedLabel()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var added = await AddAsync(sut, seed.Persoid, code: "custom", customLabel: "  Avanza ISK  ");

        added.Should().NotBeNull();
        added!.Code.Should().Be("custom");
        added.CustomLabel.Should().Be("Avanza ISK");
    }

    [Fact]
    public async Task Add_IsIdempotent_OnSystemCode()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var first = await AddAsync(sut, seed.Persoid, code: "savings_account");
        var second = await AddAsync(sut, seed.Persoid, code: "savings_account");

        second.Should().NotBeNull();
        second!.Id.Should().Be(first!.Id);

        var methods = await GetMethodsAsync(sut, seed.Persoid);
        methods.Should().HaveCount(1);
    }

    [Fact]
    public async Task Add_IsIdempotent_OnCustomLabel_CaseInsensitive()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var first = await AddAsync(sut, seed.Persoid, code: "custom", customLabel: "Premiepension");
        var second = await AddAsync(sut, seed.Persoid, code: "custom", customLabel: "premiePENSION");

        second.Should().NotBeNull();
        second!.Id.Should().Be(first!.Id);
        second.CustomLabel.Should().Be("Premiepension");

        var methods = await GetMethodsAsync(sut, seed.Persoid);
        methods.Should().HaveCount(1);
    }

    [Fact]
    public async Task Add_RejectsUnknownCode()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AddHandler.Handle(
                new AddSavingsMethodCommand(seed.Persoid, "2026-03", "notarealcode", null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("SavingsMethod.UnknownCode");
    }

    [Fact]
    public async Task Remove_DeletesRowAndIsIdempotent()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var added = await AddAsync(sut, seed.Persoid, code: "funds");
        var firstRemove = await RemoveAsync(sut, seed.Persoid, added!.Id);
        var secondRemove = await RemoveAsync(sut, seed.Persoid, added.Id);

        firstRemove.Should().BeTrue();
        secondRemove.Should().BeFalse();

        var methods = await GetMethodsAsync(sut, seed.Persoid);
        methods.Should().BeEmpty();
    }

    // Cross-budget isolation: even when another user's row id is known, the
    // delete must not touch it. The repo SQL JOINs through Savings.BudgetId
    // so the WHERE clause filters it out before MariaDB ever considers it for
    // deletion.
    [Fact]
    public async Task Remove_DoesNotDeleteRowsFromAnotherBudget()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var otherSeed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        await EnsureMonthAsync(sut, otherSeed.Persoid);

        var victim = await AddAsync(sut, otherSeed.Persoid, code: "cash");

        var result = await RemoveAsync(sut, seed.Persoid, victim!.Id);

        result.Should().BeFalse();
        var leakedMethods = await GetMethodsAsync(sut, otherSeed.Persoid);
        leakedMethods.Should().ContainSingle(m => m.Id == victim.Id);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private async Task EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-03", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
    }

    private async Task<SavingsMethodDto?> AddAsync(
        Sut sut,
        Guid persoid,
        string code,
        string? customLabel = null)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AddHandler.Handle(
                new AddSavingsMethodCommand(persoid, "2026-03", code, customLabel),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value;
    }

    private async Task<bool> RemoveAsync(Sut sut, Guid persoid, Guid savingsMethodId)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveSavingsMethodCommand(persoid, "2026-03", savingsMethodId),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value;
    }

    private async Task<IReadOnlyList<SavingsMethodDto>> GetMethodsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthSavingsMethodsQuery(persoid, "2026-03"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);
        TimeProvider sysTime = new FixedSystemTimeProvider(utcNow);

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
            AddHandler = new AddSavingsMethodCommandHandler(lifecycle, savingsRepo, sysTime),
            RemoveHandler = new RemoveSavingsMethodCommandHandler(lifecycle, savingsRepo),
            GetHandler = new GetBudgetMonthSavingsMethodsQueryHandler(
                lifecycle,
                savingsRepo,
                NullLogger<GetBudgetMonthSavingsMethodsQueryHandler>.Instance),
        };
    }

    // Test-only TimeProvider so the handler's `_timeProvider.GetUtcNow()`
    // resolves deterministically. The production `BudgetMonthLifecycleService`
    // takes our `ITimeProvider` abstraction; the handler takes the BCL
    // `TimeProvider`, so we wrap the same instant for both.
    private sealed class FixedSystemTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;
        public FixedSystemTimeProvider(DateTime utcNow) => _utcNow = new DateTimeOffset(utcNow, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _utcNow;
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required AddSavingsMethodCommandHandler AddHandler { get; init; }
        public required RemoveSavingsMethodCommandHandler RemoveHandler { get; init; }
        public required GetBudgetMonthSavingsMethodsQueryHandler GetHandler { get; init; }
    }
}
