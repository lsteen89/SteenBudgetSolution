using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
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

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

// Covers the per-month base-savings ("Bassparande") writer end-to-end:
// each of the three scopes writes the right rows, the orphan rule
// (`BudgetMonthSavings.SourceSavingsId IS NULL`) is enforced for plan
// scopes, closed months are rejected, and no-op writes stay silent (no
// audit row). Hits real SQL through the same repository the production
// handler uses so the actual UPDATE shapes get exercised.
[Collection("it:db")]
public sealed class BudgetMonthBaseSavingsEditorTests
{
    private const string YearMonth = "2026-03";
    private static readonly DateTime DefaultUtcNow = new(2026, 03, 07, 08, 00, 00, DateTimeKind.Utc);

    private readonly MariaDbFixture _db;

    public BudgetMonthBaseSavingsEditorTests(MariaDbFixture db) => _db = db;

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

    private sealed class FixedSystemTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;
        public FixedSystemTimeProvider(DateTime utcNow) => _utcNow = new DateTimeOffset(utcNow, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _utcNow;
    }

    // ---------------------------------------------------------------------
    // Happy paths — one per scope
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Patch_CurrentMonthOnly_WritesMonthRow_LeavesBaseline()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);
        var baseline = await GetBaselineSavingsAsync(seed.BudgetId);
        var monthBefore = await GetMonthSavingsAsync(ensured.BudgetMonthId);

        var result = await PatchAsync(sut, seed.Persoid, amountMonthly: 3500m, scope: "currentMonthOnly");

        result.MonthlyAmount.Should().Be(3500m);
        result.IsMonthOnly.Should().BeFalse();

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(3500m);
        monthAfter.IsOverride.Should().BeTrue();
        monthAfter.SourceSavingsId.Should().Be(baseline!.Id);

        var baselineAfter = await GetBaselineSavingsAsync(seed.BudgetId);
        baselineAfter!.MonthlySavings.Should().Be(baseline.MonthlySavings,
            "currentMonthOnly must never touch the plan");

        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(1);
    }

    [Fact]
    public async Task Patch_CurrentMonthAndBudgetPlan_WritesBothRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);

        var result = await PatchAsync(sut, seed.Persoid, amountMonthly: 4200m, scope: "currentMonthAndBudgetPlan");

        result.MonthlyAmount.Should().Be(4200m);

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(4200m);
        monthAfter.IsOverride.Should().BeTrue();

        var baselineAfter = await GetBaselineSavingsAsync(seed.BudgetId);
        baselineAfter!.MonthlySavings.Should().Be(4200m);

        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(1);
    }

    [Fact]
    public async Task Patch_BudgetPlanOnly_WritesBaseline_LeavesMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);
        var monthBefore = await GetMonthSavingsAsync(ensured.BudgetMonthId);

        var result = await PatchAsync(sut, seed.Persoid, amountMonthly: 5000m, scope: "budgetPlanOnly");

        // Response still shows the *month* value, which budgetPlanOnly does
        // not write. The dashboard for the open month therefore stays the
        // same until a new month is materialised — this is intentional.
        result.MonthlyAmount.Should().Be(monthBefore!.MonthlySavings);

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(monthBefore.MonthlySavings,
            "budgetPlanOnly must never touch the month row");

        var baselineAfter = await GetBaselineSavingsAsync(seed.BudgetId);
        baselineAfter!.MonthlySavings.Should().Be(5000m);

        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(1);
    }

    // ---------------------------------------------------------------------
    // Orphan rule — SourceSavingsId IS NULL
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Patch_PlanScope_OnOrphanMonth_FailsAndWritesNothing()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);
        var baseline = await GetBaselineSavingsAsync(seed.BudgetId);
        var monthBefore = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        await DetachSourceSavingsLinkAsync(ensured.BudgetMonthId);

        var result = await PatchRawAsync(sut, seed.Persoid, amountMonthly: 9999m, scope: "currentMonthAndBudgetPlan");

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BaseSavingsErrors.PlanMissing.Code);

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(monthBefore!.MonthlySavings);
        var baselineAfter = await GetBaselineSavingsAsync(seed.BudgetId);
        baselineAfter!.MonthlySavings.Should().Be(baseline!.MonthlySavings);

        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(0);
    }

    [Fact]
    public async Task Patch_CurrentMonthOnly_OnOrphanMonth_Succeeds()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);
        await DetachSourceSavingsLinkAsync(ensured.BudgetMonthId);

        var result = await PatchAsync(sut, seed.Persoid, amountMonthly: 1800m, scope: "currentMonthOnly");

        result.MonthlyAmount.Should().Be(1800m);
        result.IsMonthOnly.Should().BeTrue();

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(1800m);
        monthAfter.SourceSavingsId.Should().BeNull();
    }

    // ---------------------------------------------------------------------
    // Closed month
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Patch_OnClosedMonth_FailsWithMonthIsClosed()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);
        var monthBefore = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        await MarkMonthStatusAsync(YearMonth, BudgetMonthStatuses.Closed);

        var result = await PatchRawAsync(sut, seed.Persoid, amountMonthly: 7000m, scope: "currentMonthOnly");

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("BudgetMonth.MonthIsClosed");

        var monthAfter = await GetMonthSavingsAsync(ensured.BudgetMonthId);
        monthAfter!.MonthlySavings.Should().Be(monthBefore!.MonthlySavings);
        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(0);
    }

    // ---------------------------------------------------------------------
    // Idempotency / no-op
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Patch_SameAmountTwice_SecondCallIsNoOp_NoExtraAuditRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(DefaultUtcNow);
        var ensured = await EnsureMonthAsync(sut, seed.Persoid);

        var first = await PatchAsync(sut, seed.Persoid, amountMonthly: 3300m, scope: "currentMonthOnly");
        var second = await PatchAsync(sut, seed.Persoid, amountMonthly: 3300m, scope: "currentMonthOnly");

        first.MonthlyAmount.Should().Be(3300m);
        second.MonthlyAmount.Should().Be(3300m);

        (await CountChangeEventsAsync(ensured.BudgetMonthId)).Should().Be(1,
            "the second identical patch must not emit a second audit row");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private async Task<EnsureBudgetMonthLifecycleResult> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, YearMonth, CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!;
    }

    private async Task<BudgetMonthBaseSavingsEditorDto> PatchAsync(
        Sut sut,
        Guid persoid,
        decimal amountMonthly,
        string? scope)
    {
        var result = await PatchRawAsync(sut, persoid, amountMonthly, scope);
        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<Backend.Domain.Shared.Result<BudgetMonthBaseSavingsEditorDto?>> PatchRawAsync(
        Sut sut,
        Guid persoid,
        decimal amountMonthly,
        string? scope)
    {
        return await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthBaseSavingsCommand(persoid, YearMonth, amountMonthly, scope),
                CancellationToken.None));
    }

    private async Task<MonthSavingsRow?> GetMonthSavingsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<MonthSavingsRow>("""
            SELECT Id, SourceSavingsId, MonthlySavings, IsOverride
            FROM BudgetMonthSavings
            WHERE BudgetMonthId = @budgetMonthId
              AND IsDeleted = 0
            LIMIT 1;
        """, new { budgetMonthId });
    }

    private async Task<BaselineSavingsRow?> GetBaselineSavingsAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<BaselineSavingsRow>("""
            SELECT Id, MonthlySavings
            FROM Savings
            WHERE BudgetId = @budgetId
            LIMIT 1;
        """, new { budgetId });
    }

    private async Task DetachSourceSavingsLinkAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavings
            SET SourceSavingsId = NULL
            WHERE BudgetMonthId = @budgetMonthId;
        """, new { budgetMonthId });
    }

    private async Task MarkMonthStatusAsync(string yearMonth, string status)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonth
            SET Status = @status,
                ClosedAt = CASE WHEN @status = 'closed' THEN UTC_TIMESTAMP() ELSE ClosedAt END
            WHERE YearMonth = @yearMonth;
        """, new { yearMonth, status });
    }

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'base-savings';
        """, new { budgetMonthId });
    }

    private sealed class MonthSavingsRow
    {
        public Guid Id { get; init; }
        public Guid? SourceSavingsId { get; init; }
        public decimal MonthlySavings { get; init; }
        public bool IsOverride { get; init; }
    }

    private sealed class BaselineSavingsRow
    {
        public Guid Id { get; init; }
        public decimal MonthlySavings { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required PatchBudgetMonthBaseSavingsCommandHandler PatchHandler { get; init; }
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

        var baseSavingsRepo = new BudgetMonthBaseSavingsMutationRepository(
            uow,
            NullLogger<BudgetMonthBaseSavingsMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            PatchHandler = new PatchBudgetMonthBaseSavingsCommandHandler(
                lifecycle,
                baseSavingsRepo,
                changeEventRepo,
                sysTime),
        };
    }
}
