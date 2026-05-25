using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RenameSavingsGoal;
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

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor.Savings;

/// <summary>
/// V2 PR-05 — Rename savings goal. Mirrors the test surface of
/// <see cref="BudgetMonthSavingsGoalEditorTests"/> (canonical template) but
/// scoped to the rename slice: the new endpoint coordinates a snapshot
/// write + a baseline write + an open-month cascade, with the standard
/// lifecycle / status / row-load gates from the patch handler. Closed and
/// skipped months are intentionally left alone so the archive view keeps
/// historical truth.
/// </summary>
[Collection("it:db")]
public sealed class RenameBudgetMonthSavingsGoalTests
{
    private readonly MariaDbFixture _db;

    public RenameBudgetMonthSavingsGoalTests(MariaDbFixture db) => _db = db;

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
    public async Task Rename_PlanLinkedGoal_WritesSnapshotAndBaseline_AndAuditRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        target.SourceSavingsGoalId.Should().NotBeNull();

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Buffert"),
                CancellationToken.None));

        rename.IsFailure.Should().BeFalse();
        rename.Value!.Name.Should().Be("Buffert");

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.Name.Should().Be("Buffert");

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.Name.Should().Be("Buffert");

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
        (await GetLatestChangeSetAsync(budgetMonthId)).Should().Contain("\"Name\":\"Buffert\"");
    }

    [Fact]
    public async Task Rename_TrimsLeadingAndTrailingWhitespace()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "   Resa till Island   "),
                CancellationToken.None));

        rename.IsFailure.Should().BeFalse();
        rename.Value!.Name.Should().Be("Resa till Island");

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.Name.Should().Be("Resa till Island");
    }

    [Fact]
    public async Task Rename_MonthOnlyRow_WritesSnapshotOnly_AndAuditRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var originalSourceId = target.SourceSavingsGoalId!.Value;
        await DetachSourceLinkAsync(target.Id);
        var baselineBefore = await GetBaselineSavingsGoalAsync(originalSourceId);

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Endast denna månad"),
                CancellationToken.None));

        rename.IsFailure.Should().BeFalse();
        rename.Value!.Name.Should().Be("Endast denna månad");
        rename.Value.IsMonthOnly.Should().BeTrue();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.Name.Should().Be("Endast denna månad");

        // Baseline name must not have changed — the link was detached.
        var baselineAfter = await GetBaselineSavingsGoalAsync(originalSourceId);
        baselineAfter!.Name.Should().Be(baselineBefore!.Name);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task Rename_NoOp_WhenNameUnchanged_WritesNothing()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "  Emergency fund  "),
                CancellationToken.None));

        rename.IsFailure.Should().BeFalse();
        rename.Value!.Name.Should().Be("Emergency fund");

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Rename_RejectedWhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Buffert"),
                CancellationToken.None));

        rename.IsFailure.Should().BeTrue();
        rename.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task Rename_RejectedWhenRowIsDeleted()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowDeletedAsync(target.Id);

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Buffert"),
                CancellationToken.None));

        rename.IsFailure.Should().BeTrue();
        rename.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowDeleted.Code);
    }

    [Fact]
    public async Task Rename_RejectedWhenRowIsClosed()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowClosedAsync(target.Id);

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Buffert"),
                CancellationToken.None));

        rename.IsFailure.Should().BeTrue();
        rename.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowClosed.Code);
    }

    [Fact]
    public async Task Rename_FailsForOtherUser_ViaLifecycleGate()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        // Brand-new persoid that does NOT own the budget.
        var stranger = Guid.NewGuid();

        var rename = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RenameHandler.Handle(
                new RenameBudgetMonthSavingsGoalCommand(
                    Persoid: stranger,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Name: "Stulet namn"),
                CancellationToken.None));

        rename.IsFailure.Should().BeTrue();

        // The owner's row must still carry the original name.
        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.Name.Should().Be("Emergency fund");
    }

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>> GetRowsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthSavingsGoalsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<SavingsGoalDbRow?> GetMonthSavingsGoalAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<SavingsGoalDbRow>("""
            SELECT Id, Name, Status, IsDeleted
            FROM BudgetMonthSavingsGoal
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
    }

    private async Task<SavingsGoalDbRow?> GetBaselineSavingsGoalAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<SavingsGoalDbRow>("""
            SELECT Id, Name, Status, FALSE AS IsDeleted
            FROM SavingsGoal
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
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

    private async Task DetachSourceLinkAsync(Guid monthSavingsGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal
            SET SourceSavingsGoalId = NULL
            WHERE Id = @id;
        """, new { id = monthSavingsGoalId });
    }

    private async Task MarkMonthRowDeletedAsync(Guid monthSavingsGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal
            SET IsDeleted = 1
            WHERE Id = @id;
        """, new { id = monthSavingsGoalId });
    }

    private async Task MarkMonthRowClosedAsync(Guid monthSavingsGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal
            SET Status = 'closed',
                ClosedReason = 'completed',
                ClosedAt = UTC_TIMESTAMP()
            WHERE Id = @id;
        """, new { id = monthSavingsGoalId });
    }

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'savings-goal'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    private async Task<string> GetLatestChangeSetAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var json = await conn.ExecuteScalarAsync<string?>("""
            SELECT ChangeSetJson
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'savings-goal'
            ORDER BY ChangedAt DESC, Id DESC
            LIMIT 1;
        """, new { budgetMonthId });
        return json ?? string.Empty;
    }

    private sealed class SavingsGoalDbRow
    {
        public Guid Id { get; init; }
        public string? Name { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required RenameBudgetMonthSavingsGoalCommandHandler RenameHandler { get; init; }
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

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthSavingsGoalsQueryHandler(lifecycle, savingsRepo),
            RenameHandler = new RenameBudgetMonthSavingsGoalCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
