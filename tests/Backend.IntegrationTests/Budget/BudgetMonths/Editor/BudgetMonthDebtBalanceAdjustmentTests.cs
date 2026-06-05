using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;
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

// Debt PR 3: integration coverage for the `Uppdatera saldo` command.
// Lives in its own file rather than swelling `BudgetMonthDebtEditorTests`
// so a focused `--filter BudgetMonthDebtBalance` test run stays quick and
// the assertions about `DebtBalanceEvent` rows are easy to read in isolation.
[Collection("it:db")]
public sealed class BudgetMonthDebtBalanceAdjustmentTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthDebtBalanceAdjustmentTests(MariaDbFixture db) => _db = db;

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
    public async Task AdjustBalance_CurrentMonthOnly_UpdatesMonthRowOnly_AndWritesTypedEvent()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);
        var baselineBefore = await GetBaselineDebtAsync(target.SourceDebtId!.Value);
        var paymentBefore = monthBefore!.MonthlyPayment;

        var newBalance = monthBefore.Balance - 1500m;

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    newBalance,
                    BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: "Avi från långivaren."),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        adjust.Value!.MonthBalanceUpdated.Should().BeTrue();
        adjust.Value.SourceBalanceUpdated.Should().BeFalse();
        adjust.Value.MonthlyPayment.Should().Be(paymentBefore,
            "planned monthly payment must never move via balance adjustment");

        // Month row balance moved; baseline plan row untouched.
        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.Balance.Should().Be(newBalance);
        monthAfter.MonthlyPayment.Should().Be(paymentBefore);
        var baselineAfter = await GetBaselineDebtAsync(target.SourceDebtId.Value);
        baselineAfter!.Balance.Should().Be(baselineBefore!.Balance);

        // One typed history row (month-side only).
        var events = await GetBalanceEventsForMonthDebtAsync(target.Id);
        events.Should().HaveCount(1);
        events[0].OldBalance.Should().Be(monthBefore.Balance);
        events[0].NewBalance.Should().Be(newBalance);
        events[0].Delta.Should().Be(newBalance - monthBefore.Balance);
        events[0].Scope.Should().Be(BudgetMonthDebtEditScopes.CurrentMonthOnly);
        events[0].Note.Should().Be("Avi från långivaren.");
        events[0].DebtId.Should().BeNull("month-side event has no DebtId linkage");
        events[0].BudgetMonthId.Should().Be(budgetMonthId);
        (await CountBalanceEventsForBaselineDebtAsync(target.SourceDebtId.Value))
            .Should().Be(0);

        // Month-side timeline breadcrumb in `BudgetMonthChangeEvent`.
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task AdjustBalance_CurrentMonthAndPlan_UpdatesBoth_WritesEventPerSide()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");

        // Diverge first so each side has its own honest "before".
        await SetMonthDebtBalanceAsync(target.Id, 9_000m);
        await SetBaselineDebtBalanceAsync(target.SourceDebtId!.Value, 10_000m);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 7_500m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        adjust.Value!.MonthBalanceUpdated.Should().BeTrue();
        adjust.Value.SourceBalanceUpdated.Should().BeTrue();

        (await GetMonthDebtAsync(target.Id))!.Balance.Should().Be(7_500m);
        (await GetBaselineDebtAsync(target.SourceDebtId.Value))!.Balance.Should().Be(7_500m);

        var monthEvents = await GetBalanceEventsForMonthDebtAsync(target.Id);
        monthEvents.Should().HaveCount(1);
        monthEvents[0].OldBalance.Should().Be(9_000m);
        monthEvents[0].NewBalance.Should().Be(7_500m);
        monthEvents[0].Delta.Should().Be(-1_500m);

        var planEvents = await GetBalanceEventsForBaselineDebtAsync(target.SourceDebtId.Value);
        planEvents.Should().HaveCount(1);
        planEvents[0].OldBalance.Should().Be(10_000m,
            "plan-side event reads its old balance from baseline, not month row");
        planEvents[0].NewBalance.Should().Be(7_500m);
        planEvents[0].Delta.Should().Be(-2_500m);
        planEvents[0].BudgetMonthDebtId.Should().BeNull("plan-side event has no month linkage");

        // Month-side timeline breadcrumb only (one row, even though two sides moved).
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task AdjustBalance_BudgetPlanOnly_UpdatesBaselineOnly_NoMonthChangeEvent()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);
        var baselineBefore = await GetBaselineDebtAsync(target.SourceDebtId!.Value);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: baselineBefore!.Balance - 500m,
                    Scope: BudgetMonthDebtEditScopes.BudgetPlanOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        adjust.Value!.MonthBalanceUpdated.Should().BeFalse();
        adjust.Value.SourceBalanceUpdated.Should().BeTrue();

        (await GetMonthDebtAsync(target.Id))!.Balance
            .Should().Be(monthBefore!.Balance, "month row must be untouched on plan-only");
        (await GetBaselineDebtAsync(target.SourceDebtId.Value))!.Balance
            .Should().Be(baselineBefore.Balance - 500m);

        // No month-side timeline breadcrumb because the month row did not move.
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
        (await GetBalanceEventsForMonthDebtAsync(target.Id)).Should().BeEmpty();
        (await GetBalanceEventsForBaselineDebtAsync(target.SourceDebtId.Value)).Should().HaveCount(1);
    }

    [Fact]
    public async Task AdjustBalance_MonthOnlyRow_RejectsBudgetPlanScopes()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await DetachSourceLinkAsync(target.Id);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 1m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeTrue();
        adjust.Error!.Code.Should().Be(BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task AdjustBalance_ToZero_DoesNotMarkSourcePaidOff()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var sourceStatusBefore = await GetBaselineDebtStatusAsync(target.SourceDebtId!.Value);
        sourceStatusBefore.Should().Be(DebtSourceLifecycleStatuses.Active,
            "test precondition: source should start active");

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 0m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        (await GetMonthDebtAsync(target.Id))!.Balance.Should().Be(0m);
        (await GetBaselineDebtAsync(target.SourceDebtId.Value))!.Balance.Should().Be(0m);

        // Paid-off is a lifecycle transition (PR 4), not a balance side-effect.
        (await GetBaselineDebtStatusAsync(target.SourceDebtId.Value))
            .Should().Be(DebtSourceLifecycleStatuses.Active);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task AdjustBalance_RejectedWhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await MarkMonthStatusAsync("2026-01", status);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 1m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeTrue();
        adjust.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task AdjustBalance_NotIncludedRow_IsStillAllowed()
    {
        // PR 3 spec: not-included rows allowed because the underlying
        // liability is still owed. This is the explicit gap vs. the
        // planned-payment guard.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetMonthDebtParticipationAsync(
            target.Id,
            BudgetMonthDebtParticipationStatuses.NotIncluded);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 5_000m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        (await GetMonthDebtAsync(target.Id))!.Balance.Should().Be(5_000m);
    }

    [Fact]
    public async Task AdjustBalance_RemovedRow_IsRejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetMonthDebtParticipationAsync(
            target.Id,
            BudgetMonthDebtParticipationStatuses.Removed);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 1m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeTrue();
        adjust.Error!.Code.Should().Be(BudgetMonthDebtErrors.RowRemoved.Code);
    }

    [Theory]
    [InlineData("paidOff")]
    [InlineData("archived")]
    [InlineData("deleted")]
    public async Task AdjustBalance_SourceTermination_IsRejected(string terminalStatus)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetBaselineDebtStatusAsync(target.SourceDebtId!.Value, terminalStatus);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 1m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeTrue();
        adjust.Error!.Code.Should().Be(BudgetMonthDebtErrors.SourceLifecycleClosed.Code);
    }

    [Fact]
    public async Task AdjustBalance_NoOp_DoesNotWriteHistoryOrChangeEvent()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: monthBefore!.Balance,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeFalse();
        adjust.Value!.MonthBalanceUpdated.Should().BeFalse();

        (await GetBalanceEventsForMonthDebtAsync(target.Id)).Should().BeEmpty();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task AdjustBalance_NegativeBalance_RejectedAtValidator()
    {
        var validator = new AdjustBudgetMonthDebtBalanceCommandValidator();
        var result = validator.Validate(new AdjustBudgetMonthDebtBalanceCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthDebtId: Guid.NewGuid(),
            NewBalance: -1m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly,
            Note: null));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task AdjustBalance_UnsupportedScope_HandlerFailsLoudly_NoSilentNoOp()
    {
        // Bypasses the validator pipeline by calling the handler directly.
        // Without the defensive scope guard in the handler, an unsupported
        // scope would evaluate both write flags as false and return a
        // misleading "success / nothing updated" response.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);

        var adjust = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.AdjustHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    NewBalance: 1m,
                    Scope: "futureMonthOnly",
                    Note: null),
                CancellationToken.None));

        adjust.IsFailure.Should().BeTrue();
        adjust.Error!.Code.Should().Be(BudgetMonthDebtErrors.ScopeUnsupported.Code);
        (await GetMonthDebtAsync(target.Id))!.Balance
            .Should().Be(monthBefore!.Balance, "row must be untouched on rejected scope");
        (await GetBalanceEventsForMonthDebtAsync(target.Id)).Should().BeEmpty();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    // -------- helpers --------------------------------------------------

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthDebtEditorRowDto>> GetRowsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthDebtsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<DebtRow?> GetMonthDebtAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<DebtRow>("""
            SELECT Id, Balance, MonthlyPayment, Status, IsDeleted, ParticipationStatus
            FROM BudgetMonthDebt
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
    }

    private async Task<BaselineDebtRow?> GetBaselineDebtAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<BaselineDebtRow>("""
            SELECT Id, Balance, MonthlyPayment, Status
            FROM Debt
            WHERE Id = @id
            LIMIT 1;
        """, new { id });
    }

    private async Task<string> GetBaselineDebtStatusAsync(Guid id)
    {
        var row = await GetBaselineDebtAsync(id);
        row.Should().NotBeNull();
        return row!.Status;
    }

    private async Task SetMonthDebtBalanceAsync(Guid id, decimal balance)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt SET Balance = @balance WHERE Id = @id;
        """, new { id, balance });
    }

    private async Task SetBaselineDebtBalanceAsync(Guid id, decimal balance)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt SET Balance = @balance WHERE Id = @id;
        """, new { id, balance });
    }

    private async Task SetBaselineDebtStatusAsync(Guid id, string status)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt SET Status = @status WHERE Id = @id;
        """, new { id, status });
    }

    private async Task SetMonthDebtParticipationAsync(Guid id, string participation)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        // Mirror the legacy IsDeleted flag for 'removed' so any consumer
        // that still keys off it lines up with the new participation column.
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt
            SET ParticipationStatus = @participation,
                IsDeleted = CASE WHEN @participation = 'removed' THEN 1 ELSE IsDeleted END
            WHERE Id = @id;
        """, new { id, participation });
    }

    private async Task DetachSourceLinkAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt SET SourceDebtId = NULL WHERE Id = @id;
        """, new { id = monthDebtId });
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

    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'debt'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    private async Task<IReadOnlyList<BalanceEventRow>> GetBalanceEventsForMonthDebtAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var rows = await conn.QueryAsync<BalanceEventRow>("""
            SELECT Id, DebtId, BudgetMonthDebtId, BudgetMonthId,
                   OldBalance, NewBalance, Delta, Scope, Note
            FROM DebtBalanceEvent
            WHERE BudgetMonthDebtId = @monthDebtId
            ORDER BY ChangedAt;
        """, new { monthDebtId });
        return rows.AsList();
    }

    private async Task<IReadOnlyList<BalanceEventRow>> GetBalanceEventsForBaselineDebtAsync(Guid debtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        var rows = await conn.QueryAsync<BalanceEventRow>("""
            SELECT Id, DebtId, BudgetMonthDebtId, BudgetMonthId,
                   OldBalance, NewBalance, Delta, Scope, Note
            FROM DebtBalanceEvent
            WHERE DebtId = @debtId
            ORDER BY ChangedAt;
        """, new { debtId });
        return rows.AsList();
    }

    private async Task<int> CountBalanceEventsForBaselineDebtAsync(Guid debtId)
        => (await GetBalanceEventsForBaselineDebtAsync(debtId)).Count;

    private sealed class DebtRow
    {
        public Guid Id { get; init; }
        public decimal Balance { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
        public string ParticipationStatus { get; init; } = string.Empty;
    }

    private sealed class BaselineDebtRow
    {
        public Guid Id { get; init; }
        public decimal Balance { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string Status { get; init; } = string.Empty;
    }

    private sealed class BalanceEventRow
    {
        public Guid Id { get; init; }
        public Guid? DebtId { get; init; }
        public Guid? BudgetMonthDebtId { get; init; }
        public Guid? BudgetMonthId { get; init; }
        public decimal OldBalance { get; init; }
        public decimal NewBalance { get; init; }
        public decimal Delta { get; init; }
        public string Scope { get; init; } = string.Empty;
        public string? Note { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtsQueryHandler GetHandler { get; init; }
        public required AdjustBudgetMonthDebtBalanceCommandHandler AdjustHandler { get; init; }
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);

        var monthsRepo = new BudgetMonthRepository(
            uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var seedSourceRepo = new BudgetMonthSeedSourceRepository(
            uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);

        var materializer = new BudgetMonthMaterializer(
            seedSourceRepo,
            materializationRepo,
            time);

        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var debtsRepo = new BudgetMonthDebtMutationRepository(
            uow, NullLogger<BudgetMonthDebtMutationRepository>.Instance, dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow, NullLogger<BudgetMonthChangeEventRepository>.Instance, dbOpts);

        var balanceEventRepo = new DebtBalanceEventRepository(
            uow, NullLogger<DebtBalanceEventRepository>.Instance, dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthDebtsQueryHandler(lifecycle, debtsRepo),
            AdjustHandler = new AdjustBudgetMonthDebtBalanceCommandHandler(
                lifecycle,
                debtsRepo,
                balanceEventRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
