using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
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
/// V2 PR-06 — Change savings-goal target amount. Same surface as the
/// rename test (PR-05): the new endpoint coordinates a snapshot write +
/// a baseline write + an open-month cascade, plus the standard
/// lifecycle / status / row-load gates. Adds the
/// <see cref="BudgetMonthSavingsGoalErrors.TargetBelowSaved"/> guard
/// that has no parallel in the rename slice.
/// </summary>
[Collection("it:db")]
public sealed class ChangeBudgetMonthSavingsGoalTargetAmountTests
{
    private readonly MariaDbFixture _db;

    public ChangeBudgetMonthSavingsGoalTargetAmountTests(MariaDbFixture db) => _db = db;

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
    public async Task Change_PlanLinkedGoal_WritesSnapshotAndBaseline_AndAuditRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        target.SourceSavingsGoalId.Should().NotBeNull();
        var oldTarget = target.TargetAmount;

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 75_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeFalse();
        change.Value!.TargetAmount.Should().Be(75_000m);

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetAmount.Should().Be(75_000m);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.TargetAmount.Should().Be(75_000m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
        (await GetLatestChangeSetAsync(budgetMonthId)).Should().Contain("\"TargetAmount\":75000");
        // Defensive: the event payload should also record the previous value.
        if (oldTarget.HasValue)
        {
            (await GetLatestChangeSetAsync(budgetMonthId)).Should().Contain($"\"TargetAmount\":{oldTarget.Value:0}");
        }
    }

    [Fact]
    public async Task Change_MonthOnlyRow_WritesSnapshotOnly_AndAuditRow()
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

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 42_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeFalse();
        change.Value!.TargetAmount.Should().Be(42_000m);
        change.Value.IsMonthOnly.Should().BeTrue();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetAmount.Should().Be(42_000m);

        // Baseline TargetAmount must not have changed — the link was detached.
        var baselineAfter = await GetBaselineSavingsGoalAsync(originalSourceId);
        baselineAfter!.TargetAmount.Should().Be(baselineBefore!.TargetAmount);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task Change_PlanLinkedGoal_CascadesToOtherOpenLinkedRows_ButNotClosedOrSkippedRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var sourceId = target.SourceSavingsGoalId!.Value;
        var linkedRows = await InsertSyntheticLinkedMonthRowsAsync(sourceId);

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 80_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeFalse();

        (await GetMonthSavingsGoalAsync(linkedRows.OpenRowId))!.TargetAmount.Should().Be(80_000m);
        // Closed and skipped months stay at the synthetic seed value (50_000).
        (await GetMonthSavingsGoalAsync(linkedRows.ClosedRowId))!.TargetAmount.Should().Be(50_000m);
        (await GetMonthSavingsGoalAsync(linkedRows.SkippedRowId))!.TargetAmount.Should().Be(50_000m);

        (await GetLatestChangeSetAsync(budgetMonthId)).Should().Contain("\"linkedOpenMonthsUpdated\":1");
    }

    [Fact]
    public async Task Change_NoOp_WhenTargetUnchanged_WritesNothing()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        target.TargetAmount.Should().NotBeNull();

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: target.TargetAmount!.Value),
                CancellationToken.None));

        change.IsFailure.Should().BeFalse();
        change.Value!.TargetAmount.Should().Be(target.TargetAmount);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task Change_BelowAmountSaved_IsRejected_NoDbChange()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        // Seed AmountSaved high enough to land above the proposed new target.
        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 30_000m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 30_000m);
        var oldMonthTarget = (await GetMonthSavingsGoalAsync(target.Id))!.TargetAmount;
        var oldBaselineTarget = (await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value))!.TargetAmount;

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 20_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeTrue();
        change.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.TargetBelowSaved.Code);

        // Neither row moved.
        (await GetMonthSavingsGoalAsync(target.Id))!.TargetAmount.Should().Be(oldMonthTarget);
        (await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value))!.TargetAmount.Should().Be(oldBaselineTarget);
    }

    [Fact]
    public async Task Change_AtAmountSaved_IsAccepted()
    {
        // Equality boundary — the BE rejects only strictly-less targets, so
        // shrinking exactly to the already-saved figure must succeed.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 30_000m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 30_000m);

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 30_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeFalse();
        change.Value!.TargetAmount.Should().Be(30_000m);
        (await GetMonthSavingsGoalAsync(target.Id))!.TargetAmount.Should().Be(30_000m);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Change_RejectedWhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 60_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeTrue();
        change.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task Change_RejectedWhenRowIsDeleted()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowDeletedAsync(target.Id);

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 60_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeTrue();
        change.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowDeleted.Code);
    }

    [Fact]
    public async Task Change_RejectedWhenRowIsClosed()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowClosedAsync(target.Id);

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 60_000m),
                CancellationToken.None));

        change.IsFailure.Should().BeTrue();
        change.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowClosed.Code);
    }

    [Fact]
    public async Task Change_FailsForOtherUser_ViaLifecycleGate()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var originalTarget = target.TargetAmount;

        var stranger = Guid.NewGuid();

        var change = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ChangeHandler.Handle(
                new ChangeBudgetMonthSavingsGoalTargetAmountCommand(
                    Persoid: stranger,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    TargetAmount: 999_999m),
                CancellationToken.None));

        change.IsFailure.Should().BeTrue();

        // The owner's row must still carry the original target amount.
        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetAmount.Should().Be(originalTarget);
    }

    // NOTE: the "source-linked row but baseline missing" edge cannot be set
    // up in integration — the FK `FK_BudgetMonthSavingsGoal_SourceSavingsGoal`
    // uses `ON DELETE SET NULL`, so deleting the source plan nulls the
    // snapshot's link before the applier even runs. The defensive guard is
    // covered by a Moq-based unit test alongside the rename slice's
    // equivalent (`RenameBudgetMonthSavingsGoalCommandHandlerTests`).

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
            SELECT Id, TargetAmount, Status, IsDeleted
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
            SELECT Id, TargetAmount, Status, FALSE AS IsDeleted
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

    private async Task SetMonthSavingsGoalAmountSavedAsync(Guid monthSavingsGoalId, decimal amount)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal
            SET AmountSaved = @amount
            WHERE Id = @id;
        """, new { id = monthSavingsGoalId, amount });
    }

    private async Task SetBaselineSavingsGoalAmountSavedAsync(Guid baselineId, decimal amount)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE SavingsGoal
            SET AmountSaved = @amount
            WHERE Id = @id;
        """, new { id = baselineId, amount });
    }

    private async Task<LinkedRows> InsertSyntheticLinkedMonthRowsAsync(Guid sourceSavingsGoalId)
    {
        var persoid = Guid.NewGuid();
        var budgetId = Guid.NewGuid();
        var savingsId = Guid.NewGuid();
        var openMonthId = Guid.NewGuid();
        var closedMonthId = Guid.NewGuid();
        var skippedMonthId = Guid.NewGuid();
        var openSavingsId = Guid.NewGuid();
        var closedSavingsId = Guid.NewGuid();
        var skippedSavingsId = Guid.NewGuid();
        var openRowId = Guid.NewGuid();
        var closedRowId = Guid.NewGuid();
        var skippedRowId = Guid.NewGuid();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync("""
            INSERT INTO Users
                (Persoid, Firstname, LastName, Email, EmailConfirmed, Password, Roles, Locked, FirstLogin, CreatedBy)
            VALUES
                (@Persoid, 'Linked', 'Rows', @Email, 1, '$2a$12$abcdefghijkABCDEFGHIJKlmn', 'User', 0, 0, 'it');

            INSERT INTO Budget
                (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
            VALUES
                (@BudgetId, @Persoid, 'snowball', UTC_TIMESTAMP(), @Persoid);

            INSERT INTO Savings
                (Id, BudgetId, MonthlySavings, CreatedAt, CreatedByUserId)
            VALUES
                (@SavingsId, @BudgetId, 2500, UTC_TIMESTAMP(), @Persoid);

            INSERT INTO BudgetMonth
                (Id, BudgetId, YearMonth, Status, ClosedAt, CreatedAt, CreatedByUserId)
            VALUES
                (@OpenMonthId, @BudgetId, '2026-02', 'open', NULL, UTC_TIMESTAMP(), @Persoid),
                (@ClosedMonthId, @BudgetId, '2026-03', 'closed', UTC_TIMESTAMP(), UTC_TIMESTAMP(), @Persoid),
                (@SkippedMonthId, @BudgetId, '2026-04', 'skipped', NULL, UTC_TIMESTAMP(), @Persoid);

            INSERT INTO BudgetMonthSavings
                (Id, BudgetMonthId, SourceSavingsId, MonthlySavings, IsOverride, IsDeleted, CreatedAt, CreatedByUserId)
            VALUES
                (@OpenSavingsId, @OpenMonthId, @SavingsId, 2500, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@ClosedSavingsId, @ClosedMonthId, @SavingsId, 2500, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@SkippedSavingsId, @SkippedMonthId, @SavingsId, 2500, 0, 0, UTC_TIMESTAMP(), @Persoid);

            INSERT INTO BudgetMonthSavingsGoal
                (Id, BudgetMonthSavingsId, SourceSavingsGoalId, Name, TargetAmount, TargetDate, AmountSaved,
                 MonthlyContribution, OpenedAt, Status, IsOverride, IsDeleted, SortOrder, CreatedAt, CreatedByUserId)
            VALUES
                (@OpenRowId, @OpenSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', 10000,
                 1500, UTC_TIMESTAMP(), 'active', 0, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@ClosedRowId, @ClosedSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', 10000,
                 1500, UTC_TIMESTAMP(), 'active', 0, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@SkippedRowId, @SkippedSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', 10000,
                 1500, UTC_TIMESTAMP(), 'active', 0, 0, 0, UTC_TIMESTAMP(), @Persoid);
        """, new
        {
            Persoid = persoid,
            Email = $"linked+{persoid:N}@example.com",
            BudgetId = budgetId,
            SavingsId = savingsId,
            OpenMonthId = openMonthId,
            ClosedMonthId = closedMonthId,
            SkippedMonthId = skippedMonthId,
            OpenSavingsId = openSavingsId,
            ClosedSavingsId = closedSavingsId,
            SkippedSavingsId = skippedSavingsId,
            OpenRowId = openRowId,
            ClosedRowId = closedRowId,
            SkippedRowId = skippedRowId,
            SourceSavingsGoalId = sourceSavingsGoalId
        });

        return new LinkedRows(openRowId, closedRowId, skippedRowId);
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
        public decimal? TargetAmount { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
    }

    private sealed record LinkedRows(Guid OpenRowId, Guid ClosedRowId, Guid SkippedRowId);

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required ChangeBudgetMonthSavingsGoalTargetAmountCommandHandler ChangeHandler { get; init; }
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
            ChangeHandler = new ChangeBudgetMonthSavingsGoalTargetAmountCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
