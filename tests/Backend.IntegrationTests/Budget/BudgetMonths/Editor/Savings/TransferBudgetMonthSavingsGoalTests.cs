using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Audit;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
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
/// V2 PR-07 — One-time transfer (Sätt in / Ta ut). The new endpoint
/// mutates a goal's <c>AmountSaved</c> by a signed delta. Distinguishing
/// invariants vs PR-05 (rename) / PR-06 (target amount):
/// <list type="bullet">
///   <item>Only two writes — snapshot + baseline. The cascade to other
///         open months is intentionally absent so a mid-month transfer
///         applies only to the month the user is editing.</item>
///   <item>Below-zero withdraw is rejected with
///         <see cref="BudgetMonthSavingsGoalErrors.WithdrawalBelowZero"/>.</item>
///   <item>Non-idempotent — two consecutive deposits add up. The audit
///         row count and the running balance both reflect this.</item>
/// </list>
/// </summary>
[Collection("it:db")]
public sealed class TransferBudgetMonthSavingsGoalTests
{
    private readonly MariaDbFixture _db;

    public TransferBudgetMonthSavingsGoalTests(MariaDbFixture db) => _db = db;

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
    public async Task Deposit_PlanLinkedGoal_WritesSnapshotAndBaseline_AndAuditRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        target.SourceSavingsGoalId.Should().NotBeNull();
        var oldAmountSaved = target.AmountSaved ?? 0m;

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 1_000m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: "counterAccount: Sparkonto"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.AmountSaved.Should().Be(oldAmountSaved + 1_000m);

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.AmountSaved.Should().Be(oldAmountSaved + 1_000m);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.AmountSaved.Should().Be(oldAmountSaved + 1_000m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
        var changeSet = await GetLatestChangeSetAsync(budgetMonthId);
        changeSet.Should().Contain("\"direction\":\"deposit\"");
        changeSet.Should().Contain("\"amount\":1000");
        changeSet.Should().Contain("\"baselineUpdated\":true");
        changeSet.Should().Contain("\"note\":\"counterAccount: Sparkonto\"");
    }

    [Fact]
    public async Task Withdraw_PlanLinkedGoal_DecrementsBothRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        // Seed a known starting balance so the assertion is simple.
        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 5_000m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 5_000m);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 1_200m,
                    Direction: SavingsGoalTransferDirections.Withdraw,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.AmountSaved.Should().Be(3_800m);

        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(3_800m);
        (await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value))!.AmountSaved.Should().Be(3_800m);
    }

    [Fact]
    public async Task Deposit_MonthOnlyRow_WritesSnapshotOnly()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var originalSourceId = target.SourceSavingsGoalId!.Value;
        var oldMonth = (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved ?? 0m;
        await DetachSourceLinkAsync(target.Id);
        var baselineBefore = (await GetBaselineSavingsGoalAsync(originalSourceId))!.AmountSaved;

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 250m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.IsMonthOnly.Should().BeTrue();
        result.Value.AmountSaved.Should().Be(oldMonth + 250m);

        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(oldMonth + 250m);

        // The baseline is untouched — the row is detached.
        (await GetBaselineSavingsGoalAsync(originalSourceId))!.AmountSaved.Should().Be(baselineBefore);
    }

    [Fact]
    public async Task Withdraw_BelowZero_IsRejected_NoDbChange()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 100m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 100m);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 500m,
                    Direction: SavingsGoalTransferDirections.Withdraw,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.WithdrawalBelowZero.Code);

        // Neither row moved.
        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(100m);
        (await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value))!.AmountSaved.Should().Be(100m);
    }

    [Fact]
    public async Task Withdraw_ExactlyToZero_IsAccepted()
    {
        // Equality boundary — the BE rejects only when AmountSaved would be
        // strictly negative, so a withdraw exactly to zero must succeed.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 500m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 500m);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 500m,
                    Direction: SavingsGoalTransferDirections.Withdraw,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.AmountSaved.Should().Be(0m);
        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(0m);
    }

    [Fact]
    public async Task Deposit_DoesNotCascade_ToOtherOpenLinkedMonths()
    {
        // The defining PR-07 invariant vs PR-05 / PR-06: a mid-month
        // transfer applies only to the month the user is editing. Other
        // open months that happen to share the same source plan keep their
        // own AmountSaved snapshots until they are individually touched.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var sourceId = target.SourceSavingsGoalId!.Value;
        var linkedRows = await InsertSyntheticLinkedMonthRowsAsync(sourceId, seededAmountSaved: 10_000m);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 1_500m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        // The other open / closed / skipped linked months stay at the
        // synthetic seed value (10_000) — only the current month moves.
        (await GetMonthSavingsGoalAsync(linkedRows.OpenRowId))!.AmountSaved.Should().Be(10_000m);
        (await GetMonthSavingsGoalAsync(linkedRows.ClosedRowId))!.AmountSaved.Should().Be(10_000m);
        (await GetMonthSavingsGoalAsync(linkedRows.SkippedRowId))!.AmountSaved.Should().Be(10_000m);
    }

    [Fact]
    public async Task Deposit_IsNotIdempotent_TwoCallsAddUp()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        await SetMonthSavingsGoalAmountSavedAsync(target.Id, 0m);
        await SetBaselineSavingsGoalAmountSavedAsync(target.SourceSavingsGoalId!.Value, 0m);

        async Task DepositOnce()
        {
            var r = await sut.Uow.InTx(CancellationToken.None, () =>
                sut.TransferHandler.Handle(
                    new TransferBudgetMonthSavingsGoalCommand(
                        Persoid: seed.Persoid,
                        YearMonth: "2026-01",
                        MonthSavingsGoalId: target.Id,
                        Amount: 250m,
                        Direction: SavingsGoalTransferDirections.Deposit,
                        Note: null),
                    CancellationToken.None));
            r.IsFailure.Should().BeFalse();
        }

        await DepositOnce();
        await DepositOnce();

        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(500m);
        (await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value))!.AmountSaved.Should().Be(500m);

        // Two audit rows — non-idempotent by design.
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(2);
    }

    [Fact]
    public async Task Deposit_ThenCloseMonth_AmountSavedAtCloseIncludesTransferAndMonthlyContribution()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        await SetIncomePaymentTimingAsync(seed.BudgetId, "dayOfMonth", 25);
        var sut = CreateSut(new DateTime(2026, 01, 31, 12, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");

        var initialAmountSaved = target.AmountSaved ?? 0m;
        var monthlyContribution = target.MonthlyContribution;
        var targetAmount = target.TargetAmount!.Value;
        var deposit = targetAmount - initialAmountSaved - monthlyContribution;
        deposit.Should().BeGreaterThan(0m);

        var transfer = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: deposit,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        transfer.IsSuccess.Should().BeTrue();

        var close = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-01",
                    new CloseBudgetMonthRequestDto(
                        BudgetMonthCarryOverModes.None,
                        CompletedSavingsGoalIds: new[] { target.Id })),
                CancellationToken.None));

        close.IsSuccess.Should().BeTrue();

        var archive = await GetOldRowsAsync(sut, seed.Persoid, "2026-01");
        var archivedTarget = archive.Single(r => r.SourceSavingsGoalId == target.SourceSavingsGoalId);

        archivedTarget.AmountSavedAtClose.Should().Be(
            initialAmountSaved + deposit + monthlyContribution);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Transfer_RejectedWhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 100m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task Transfer_RejectedWhenRowIsDeleted()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowDeletedAsync(target.Id);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 100m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowDeleted.Code);
    }

    [Fact]
    public async Task Transfer_RejectedWhenRowIsClosed()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        await MarkMonthRowClosedAsync(target.Id);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 100m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.RowClosed.Code);
    }

    [Fact]
    public async Task Transfer_FailsForOtherUser_ViaLifecycleGate()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid))
            .First(r => r.Name == "Emergency fund");
        var originalAmountSaved = (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved;

        var stranger = Guid.NewGuid();

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.TransferHandler.Handle(
                new TransferBudgetMonthSavingsGoalCommand(
                    Persoid: stranger,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    Amount: 999_999m,
                    Direction: SavingsGoalTransferDirections.Deposit,
                    Note: null),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();

        // The owner's row must still carry the original balance.
        (await GetMonthSavingsGoalAsync(target.Id))!.AmountSaved.Should().Be(originalAmountSaved);
    }

    // NOTE: the "source-linked row but baseline missing" edge cannot be set
    // up in integration — the FK `FK_BudgetMonthSavingsGoal_SourceSavingsGoal`
    // uses `ON DELETE SET NULL`, so deleting the source plan nulls the
    // snapshot's link before the applier even runs. The defensive guard is
    // covered by a Moq-based unit test
    // (`TransferBudgetMonthSavingsGoalCommandHandlerTests`).

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

    private async Task<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>> GetOldRowsAsync(
        Sut sut,
        Guid persoid,
        string yearMonth)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetOldHandler.Handle(
                new GetOldBudgetMonthSavingsGoalsQuery(persoid, yearMonth),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<SavingsGoalDbRow?> GetMonthSavingsGoalAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<SavingsGoalDbRow>("""
            SELECT Id, AmountSaved, Status, IsDeleted
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
            SELECT Id, AmountSaved, Status, FALSE AS IsDeleted
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

    private async Task SetIncomePaymentTimingAsync(
        Guid budgetId,
        string incomePaymentDayType,
        int? incomePaymentDay)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Income
            SET IncomePaymentDayType = @incomePaymentDayType,
                IncomePaymentDay = @incomePaymentDay
            WHERE BudgetId = @budgetId;
        """, new
        {
            budgetId,
            incomePaymentDayType,
            incomePaymentDay
        });
    }

    private async Task<LinkedRows> InsertSyntheticLinkedMonthRowsAsync(
        Guid sourceSavingsGoalId,
        decimal seededAmountSaved)
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
                (@OpenRowId, @OpenSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', @AmountSaved,
                 1500, UTC_TIMESTAMP(), 'active', 0, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@ClosedRowId, @ClosedSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', @AmountSaved,
                 1500, UTC_TIMESTAMP(), 'active', 0, 0, 0, UTC_TIMESTAMP(), @Persoid),
                (@SkippedRowId, @SkippedSavingsId, @SourceSavingsGoalId, 'Emergency fund', 50000, '2026-12-31', @AmountSaved,
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
            SourceSavingsGoalId = sourceSavingsGoalId,
            AmountSaved = seededAmountSaved
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
        public decimal? AmountSaved { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
    }

    private sealed record LinkedRows(Guid OpenRowId, Guid ClosedRowId, Guid SkippedRowId);

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required GetOldBudgetMonthSavingsGoalsQueryHandler GetOldHandler { get; init; }
        public required TransferBudgetMonthSavingsGoalCommandHandler TransferHandler { get; init; }
        public required CloseBudgetMonthCommandHandler CloseHandler { get; init; }
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

        var monthDashboardRepo = new BudgetMonthDashboardRepository(
            uow,
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            time);

        var savingsRepo = new BudgetMonthSavingsGoalMutationRepository(
            uow,
            NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        var closeSnapshot = new BudgetMonthCloseSnapshotService(
            new BudgetMonthlyTotalsService(monthDashboardRepo));

        var auditWriter = new BudgetAuditWriter(
            uow,
            NullLogger<BudgetAuditWriter>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthSavingsGoalsQueryHandler(lifecycle, savingsRepo),
            GetOldHandler = new GetOldBudgetMonthSavingsGoalsQueryHandler(
                lifecycle,
                savingsRepo,
                TimeProvider.System),
            TransferHandler = new TransferBudgetMonthSavingsGoalCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System),
            CloseHandler = new CloseBudgetMonthCommandHandler(
                monthsRepo,
                lifecycle,
                monthDashboardRepo,
                materializer,
                closeSnapshot,
                auditWriter,
                savingsRepo,
                changeEventRepo,
                time)
        };
    }
}
