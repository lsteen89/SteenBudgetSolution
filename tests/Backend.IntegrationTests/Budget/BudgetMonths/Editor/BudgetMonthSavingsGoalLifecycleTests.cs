using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CancelSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CompleteSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsGoal;
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

[Collection("it:db")]
public sealed class BudgetMonthSavingsGoalLifecycleTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthSavingsGoalLifecycleTests(MariaDbFixture db) => _db = db;

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

    // ---------------------------------------------------------------------
    // Complete
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Complete_SourceLinked_ClosesMonthAndSource_WithCompletedReason_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.Status.Should().Be(SavingsGoalStatuses.Closed);
        result.Value.ClosedReason.Should().Be(SavingsGoalClosedReasons.Completed);
        result.Value.ClosedAt.Should().NotBeNull();
        result.Value.IsDeleted.Should().BeFalse();
        result.Value.CanUpdateDefault.Should().BeFalse();

        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Completed);
        month.ClosedAt.Should().NotBeNull();
        month.IsDeleted.Should().BeFalse();

        var source = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        source!.Status.Should().Be(SavingsGoalStatuses.Closed);
        source.ClosedReason.Should().Be(SavingsGoalClosedReasons.Completed);
        source.ClosedAt.Should().NotBeNull();

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
        var latest = await GetLatestChangeSetAsync(budgetMonthId);
        latest.Should().Contain("\"completeSavingsGoal\"");
        latest.Should().Contain("\"Status\":\"closed\"");
        latest.Should().Contain("\"ClosedReason\":\"completed\"");
    }

    [Fact]
    public async Task Complete_MonthOnly_ClosesOnlyMonthRow_AndLeavesSourceUntouched()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var sourceBefore = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        await DetachSourceLinkAsync(target.Id);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Completed);

        // Source row is still active — the detach severed the link, so the
        // plan goal must not be touched by the month-only action.
        var sourceAfter = await GetSourceGoalAsync(target.SourceSavingsGoalId.Value);
        sourceAfter!.Status.Should().Be(sourceBefore!.Status);
        sourceAfter.ClosedReason.Should().Be(sourceBefore.ClosedReason);
        sourceAfter.ClosedAt.Should().Be(sourceBefore.ClosedAt);
    }

    [Fact]
    public async Task Complete_AlreadyClosedGoal_IsRejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var first = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));
        first.IsFailure.Should().BeFalse();

        var second = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        second.IsFailure.Should().BeTrue();
        second.Error!.Code.Should().Be(SavingsGoalLifecycleErrors.AlreadyClosed.Code);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Complete_OnNonOpenMonth_IsRejected(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task Complete_GoalFromAnotherBudget_IsRejected()
    {
        await _db.ResetAsync();
        var owner = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, owner.Persoid);
        var target = (await GetRowsAsync(sut, owner.Persoid)).First(r => r.Name == "Emergency fund");

        var attacker = Guid.NewGuid();
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(attacker, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();

        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Active);
    }

    // ---------------------------------------------------------------------
    // Cancel
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Cancel_SourceLinked_ClosesMonthAndSource_WithCancelledReason()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CancelHandler.Handle(
                new CancelBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Cancelled);
        month.IsDeleted.Should().BeFalse();

        var source = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        source!.Status.Should().Be(SavingsGoalStatuses.Closed);
        source.ClosedReason.Should().Be(SavingsGoalClosedReasons.Cancelled);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task Cancel_MonthOnly_ClosesOnlyMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var sourceBefore = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        await DetachSourceLinkAsync(target.Id);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CancelHandler.Handle(
                new CancelBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Cancelled);

        var sourceAfter = await GetSourceGoalAsync(target.SourceSavingsGoalId.Value);
        sourceAfter!.Status.Should().Be(sourceBefore!.Status);
        sourceAfter.ClosedReason.Should().Be(sourceBefore.ClosedReason);
    }

    [Fact]
    public async Task Cancel_AlreadyClosedGoal_IsRejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        var cancel = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CancelHandler.Handle(
                new CancelBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        cancel.IsFailure.Should().BeTrue();
        cancel.Error!.Code.Should().Be(SavingsGoalLifecycleErrors.AlreadyClosed.Code);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Cancel_OnNonOpenMonth_IsRejected(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CancelHandler.Handle(
                new CancelBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    // ---------------------------------------------------------------------
    // Remove
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Remove_SourceLinked_ClosesAndSoftDeletesMonth_AndClosesSource()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.IsDeleted.Should().BeTrue();
        result.Value.ClosedReason.Should().Be(SavingsGoalClosedReasons.Removed);

        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Removed);
        month.IsDeleted.Should().BeTrue();

        var source = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        source!.Status.Should().Be(SavingsGoalStatuses.Closed);
        source.ClosedReason.Should().Be(SavingsGoalClosedReasons.Removed);

        var rowsAfter = await GetRowsAsync(sut, seed.Persoid);
        rowsAfter.Should().NotContain(r => r.Id == target.Id);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task Remove_MonthOnly_SoftDeletesMonthRow_AndDoesNotTouchSource()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var sourceBefore = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        await DetachSourceLinkAsync(target.Id);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        var month = await GetMonthGoalAsync(target.Id);
        month!.IsDeleted.Should().BeTrue();
        month.Status.Should().Be(SavingsGoalStatuses.Closed);
        month.ClosedReason.Should().Be(SavingsGoalClosedReasons.Removed);

        var sourceAfter = await GetSourceGoalAsync(target.SourceSavingsGoalId.Value);
        sourceAfter!.Status.Should().Be(sourceBefore!.Status);
        sourceAfter.ClosedReason.Should().Be(sourceBefore.ClosedReason);
    }

    [Fact]
    public async Task Remove_AlreadyDeletedRow_IsRejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var first = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));
        first.IsFailure.Should().BeFalse();

        var second = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        second.IsFailure.Should().BeTrue();
        second.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowDeleted.Code);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Remove_OnNonOpenMonth_IsRejected(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    // ---------------------------------------------------------------------
    // Cross-action: source goal already closed by another flow
    // ---------------------------------------------------------------------

    [Fact]
    public async Task Action_FailsAtomically_WhenSourceGoalIsAlreadyClosed()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        // Force the source row to a closed state while the month row stays
        // active. This simulates the legacy/manual closure path that
        // ApplyToSourceGoalIfLinked must defend against.
        await ForceSourceClosedAsync(
            target.SourceSavingsGoalId!.Value,
            SavingsGoalClosedReasons.Cancelled,
            DateTime.UtcNow);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CompleteHandler.Handle(
                new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(SavingsGoalLifecycleErrors.AlreadyClosed.Code);

        // ApplyToSourceGoalIfLinked rejects before any DB write is attempted,
        // so the month row stays active via pre-write rejection (not rollback).
        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Active);
        month.ClosedReason.Should().BeNull();
    }

    [Fact]
    public async Task Action_MidWriteFailure_RollsBackBothWritesAtomically()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        // Wire a handler that uses the same UoW but with a repo that throws
        // on the source-goal write. UpdateMonthSavingsGoalLifecycleAsync runs
        // successfully on the shared connection; UpdateBaselineSavingsGoalLifecycleAsync
        // then throws inside the same transaction, which is never committed.
        var dbOpts = DbOptions(_db.ConnectionString);
        var realRepo = new BudgetMonthSavingsGoalMutationRepository(
            sut.Uow,
            NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance,
            dbOpts);
        var faultingRepo = new ThrowOnBaselineWriteRepo(realRepo);
        var changeEventRepo = new BudgetMonthChangeEventRepository(
            sut.Uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);
        var faultingHandler = new CompleteBudgetMonthSavingsGoalCommandHandler(
            sut.Lifecycle, faultingRepo, changeEventRepo, TimeProvider.System);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.Uow.InTx(CancellationToken.None, () =>
                faultingHandler.Handle(
                    new CompleteBudgetMonthSavingsGoalCommand(seed.Persoid, "2026-01", target.Id),
                    CancellationToken.None)));

        // Transaction never committed — fresh connections must see the original state.
        var month = await GetMonthGoalAsync(target.Id);
        month!.Status.Should().Be(SavingsGoalStatuses.Active);
        month.ClosedReason.Should().BeNull();

        var source = await GetSourceGoalAsync(target.SourceSavingsGoalId!.Value);
        source!.Status.Should().Be(SavingsGoalStatuses.Active);
        source.ClosedReason.Should().BeNull();

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

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

    private async Task<GoalDbRow?> GetMonthGoalAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<GoalDbRow>("""
            SELECT Id, Status, ClosedReason, ClosedAt, IsDeleted
            FROM BudgetMonthSavingsGoal
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
    }

    private async Task<GoalDbRow?> GetSourceGoalAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<GoalDbRow>("""
            SELECT Id, Status, ClosedReason, ClosedAt, FALSE AS IsDeleted
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

    private async Task ForceSourceClosedAsync(Guid sourceId, string closedReason, DateTime closedAt)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE SavingsGoal
            SET Status = 'closed',
                ClosedReason = @closedReason,
                ClosedAt = @closedAt
            WHERE Id = @sourceId;
        """, new { sourceId, closedReason, closedAt });
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

    private sealed class GoalDbRow
    {
        public Guid Id { get; init; }
        public string Status { get; init; } = string.Empty;
        public string? ClosedReason { get; init; }
        public DateTime? ClosedAt { get; init; }
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required CompleteBudgetMonthSavingsGoalCommandHandler CompleteHandler { get; init; }
        public required CancelBudgetMonthSavingsGoalCommandHandler CancelHandler { get; init; }
        public required RemoveBudgetMonthSavingsGoalCommandHandler RemoveHandler { get; init; }
    }

    // Wraps the real repo and throws on the second write (source-goal update)
    // so tests can prove the month-row write is not committed when the source
    // write fails mid-transaction.
    private sealed class ThrowOnBaselineWriteRepo : IBudgetMonthSavingsGoalMutationRepository
    {
        private readonly IBudgetMonthSavingsGoalMutationRepository _inner;
        public ThrowOnBaselineWriteRepo(IBudgetMonthSavingsGoalMutationRepository inner) => _inner = inner;

        public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
            => _inner.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        public Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowReadModel>> GetSavingsGoalEditorRowsAsync(Guid budgetMonthId, bool includeDeleted, CancellationToken ct)
            => _inner.GetSavingsGoalEditorRowsAsync(budgetMonthId, includeDeleted, ct);
        public Task<BudgetMonthSavingsGoalMutationReadModel?> GetSavingsGoalForMutationAsync(Guid budgetMonthId, Guid monthSavingsGoalId, CancellationToken ct)
            => _inner.GetSavingsGoalForMutationAsync(budgetMonthId, monthSavingsGoalId, ct);
        public Task UpdateMonthSavingsGoalContributionAsync(UpdateBudgetMonthSavingsGoalModel model, CancellationToken ct)
            => _inner.UpdateMonthSavingsGoalContributionAsync(model, ct);
        public Task<bool> BaselineSavingsGoalExistsAsync(Guid savingsGoalId, CancellationToken ct)
            => _inner.BaselineSavingsGoalExistsAsync(savingsGoalId, ct);
        public Task UpdateBaselineSavingsGoalContributionAsync(UpdateBaselineSavingsGoalModel model, CancellationToken ct)
            => _inner.UpdateBaselineSavingsGoalContributionAsync(model, ct);
        public Task UpdateMonthSavingsGoalTargetDateAsync(UpdateBudgetMonthSavingsGoalTargetDateModel model, CancellationToken ct)
            => _inner.UpdateMonthSavingsGoalTargetDateAsync(model, ct);
        public Task UpdateBaselineSavingsGoalTargetDateAsync(UpdateBaselineSavingsGoalTargetDateModel model, CancellationToken ct)
            => _inner.UpdateBaselineSavingsGoalTargetDateAsync(model, ct);
        public Task<int> UpdateOpenLinkedMonthSavingsGoalTargetDateAsync(UpdateOpenLinkedMonthSavingsGoalTargetDateModel model, CancellationToken ct)
            => _inner.UpdateOpenLinkedMonthSavingsGoalTargetDateAsync(model, ct);
        public Task UpdateMonthSavingsGoalNameAsync(UpdateBudgetMonthSavingsGoalNameModel model, CancellationToken ct)
            => _inner.UpdateMonthSavingsGoalNameAsync(model, ct);
        public Task UpdateBaselineSavingsGoalNameAsync(UpdateBaselineSavingsGoalNameModel model, CancellationToken ct)
            => _inner.UpdateBaselineSavingsGoalNameAsync(model, ct);
        public Task<int> UpdateOpenLinkedMonthSavingsGoalNameAsync(UpdateOpenLinkedMonthSavingsGoalNameModel model, CancellationToken ct)
            => _inner.UpdateOpenLinkedMonthSavingsGoalNameAsync(model, ct);
        public Task<BudgetMonthSavingsForCreateReadModel?> GetBudgetMonthSavingsForCreateAsync(Guid budgetMonthId, CancellationToken ct)
            => _inner.GetBudgetMonthSavingsForCreateAsync(budgetMonthId, ct);
        public Task InsertBaselineSavingsGoalAsync(InsertBaselineSavingsGoalModel model, CancellationToken ct)
            => _inner.InsertBaselineSavingsGoalAsync(model, ct);
        public Task InsertMonthSavingsGoalAsync(InsertBudgetMonthSavingsGoalModel model, CancellationToken ct)
            => _inner.InsertMonthSavingsGoalAsync(model, ct);
        public Task<BudgetMonthSavingsGoalLifecycleReadModel?> GetSourceSavingsGoalLifecycleAsync(Guid savingsGoalId, CancellationToken ct)
            => _inner.GetSourceSavingsGoalLifecycleAsync(savingsGoalId, ct);
        public Task UpdateMonthSavingsGoalLifecycleAsync(UpdateBudgetMonthSavingsGoalLifecycleModel model, CancellationToken ct)
            => _inner.UpdateMonthSavingsGoalLifecycleAsync(model, ct);
        public Task UpdateBaselineSavingsGoalLifecycleAsync(UpdateBaselineSavingsGoalLifecycleModel model, CancellationToken ct)
            => throw new InvalidOperationException("simulated source-write failure");
        public Task<IReadOnlyList<BudgetMonthSavingsGoalCompletionCandidateReadModel>> GetCompletionCandidatesAsync(Guid budgetMonthId, CancellationToken ct)
            => _inner.GetCompletionCandidatesAsync(budgetMonthId, ct);
        public Task<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowReadModel>> GetSavingsGoalArchiveRowsAsync(Guid budgetId, DateTime upperBoundUtc, CancellationToken ct)
            => _inner.GetSavingsGoalArchiveRowsAsync(budgetId, upperBoundUtc, ct);
        public Task<IReadOnlyList<SavingsMethodReadModel>> GetSavingsMethodsAsync(Guid budgetId, CancellationToken ct)
            => _inner.GetSavingsMethodsAsync(budgetId, ct);
        public Task<Guid?> GetSavingsIdForBudgetAsync(Guid budgetId, CancellationToken ct)
            => _inner.GetSavingsIdForBudgetAsync(budgetId, ct);
        public Task InsertSavingsMethodAsync(InsertSavingsMethodModel model, CancellationToken ct)
            => _inner.InsertSavingsMethodAsync(model, ct);
        public Task<int> DeleteSavingsMethodAsync(Guid budgetId, Guid savingsMethodId, CancellationToken ct)
            => _inner.DeleteSavingsMethodAsync(budgetId, savingsMethodId, ct);
        public Task<int> CloseLinkedActiveMonthSavingsGoalsForSourceAsync(Guid sourceSavingsGoalId, Guid excludeMonthGoalId, string closedReason, DateTime closedAtUtc, Guid actorPersoid, CancellationToken ct)
            => _inner.CloseLinkedActiveMonthSavingsGoalsForSourceAsync(sourceSavingsGoalId, excludeMonthGoalId, closedReason, closedAtUtc, actorPersoid, ct);
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
            CompleteHandler = new CompleteBudgetMonthSavingsGoalCommandHandler(
                lifecycle, savingsRepo, changeEventRepo, TimeProvider.System),
            CancelHandler = new CancelBudgetMonthSavingsGoalCommandHandler(
                lifecycle, savingsRepo, changeEventRepo, TimeProvider.System),
            RemoveHandler = new RemoveBudgetMonthSavingsGoalCommandHandler(
                lifecycle, savingsRepo, changeEventRepo, TimeProvider.System),
        };
    }
}
