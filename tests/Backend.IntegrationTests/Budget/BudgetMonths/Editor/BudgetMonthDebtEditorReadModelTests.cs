using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Archive;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.MarkPaidOff;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Remove;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Restore;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
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

// Debt PR 5: integration tests for the target editor read model
// (`GET /api/budgets/months/{yearMonth}/debt-editor`). Each test sets up
// real persisted state via the PR 2-4 command handlers (or direct seed
// helpers when a state is otherwise unreachable through the editor surface)
// and asserts the read model exposes the right rows, groups, summary
// totals, action permissions, and disabled reason codes.
//
// The file name keeps the `BudgetMonthDebtEditor` prefix so the existing
// `dotnet test --filter BudgetMonthDebtEditor` filter from PR 1-4's
// validation commands picks these up automatically.
[Collection("it:db")]
public sealed class BudgetMonthDebtEditorReadModelTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthDebtEditorReadModelTests(MariaDbFixture db) => _db = db;

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

    // ---------------------------------------------------------------- happy path

    [Fact]
    public async Task GetEditor_ReturnsActiveRowsWithSourceFieldPairs_AndMatchingSummary()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var editor = await GetEditorAsync(sut, seed.Persoid);

        editor.MonthStatus.Should().Be(BudgetMonthStatuses.Open);
        editor.IsReadOnly.Should().BeFalse();
        editor.YearMonth.Should().Be("2026-01");

        var rows = editor.Rows;
        rows.Should().NotBeEmpty();
        rows.Should().OnlyContain(r => r.Group != BudgetMonthDebtEditorGroups.Paid);
        rows.Should().OnlyContain(r => r.Group != BudgetMonthDebtEditorGroups.Archived);

        // Source-linked rows expose every Source* field, month-only rows leave
        // them null. The seed scenario produces source-linked rows only at
        // this point.
        rows.Should().OnlyContain(r => r.SourceDebtId != null);
        rows.Should().OnlyContain(r => r.SourceMonthlyPayment != null);
        rows.Should().OnlyContain(r => r.SourceBalance != null);
        rows.Should().OnlyContain(r => r.SourceLifecycleStatus == DebtSourceLifecycleStatuses.Active);

        // Summary reconciles row totals: included = sum(MonthlyPayment) of
        // active group, liability = sum(Balance) of active + skipped groups.
        editor.Summary.IncludedMonthlyPaymentTotal
            .Should().Be(rows.Sum(r => r.MonthlyPayment));
        editor.Summary.ActiveLiabilityBalanceTotal
            .Should().Be(rows.Sum(r => r.Balance));
        editor.Summary.NotIncludedMonthlyPaymentTotal.Should().Be(0m);
        editor.Summary.PaidOffBalanceTotal.Should().Be(0m);
        editor.Summary.ArchivedBalanceTotal.Should().Be(0m);
        editor.Summary.IncludedCount.Should().Be(rows.Count);
        editor.Summary.NotIncludedCount.Should().Be(0);
        editor.Summary.PaidOffCount.Should().Be(0);
        editor.Summary.ArchivedCount.Should().Be(0);
    }

    // -------------------------------------------------- summary reconciliation

    [Fact]
    public async Task GetEditor_IncludedPaymentTotal_ReconcilesWithDashboardSql()
    {
        // The editor summary's `IncludedMonthlyPaymentTotal` is the same
        // figure the dashboard equation uses for "skuldbetalningar". PR 5's
        // acceptance criterion is explicit: "Dashboard and editor summaries
        // reconcile". Both apply the same filters
        // (`ParticipationStatus = 'included'`, source = active, not deleted).
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var editor = await GetEditorAsync(sut, seed.Persoid);

        var dashboardDebtTotal = await SumDashboardDebtPaymentsAsync(budgetMonthId);

        editor.Summary.IncludedMonthlyPaymentTotal.Should().Be(dashboardDebtTotal);
    }

    // ---------------------------------------------------------- notIncluded row

    [Fact]
    public async Task GetEditor_NotIncludedRow_AppearsInSkippedGroup_ExcludedFromPaymentTotal()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        // Use the real participation handler so the row reaches `notIncluded`
        // through the same SQL the FE will trigger.
        var skip = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ParticipationHandler.Handle(
                new SetBudgetMonthDebtParticipationCommand(
                    seed.Persoid, "2026-01", creditCard.Id,
                    Participation: BudgetMonthDebtParticipationStatuses.NotIncluded,
                    Note: null),
                CancellationToken.None));
        skip.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var skippedRow = editor.Rows.Single(r => r.Id == creditCard.Id);

        skippedRow.Group.Should().Be(BudgetMonthDebtEditorGroups.Skipped);
        skippedRow.ParticipationStatus.Should().Be(BudgetMonthDebtParticipationStatuses.NotIncluded);
        skippedRow.MonthlyPayment.Should().Be(creditCard.MonthlyPayment, "skip never zeroes the planned amount");

        // Skipped rows: payment excluded from `Included*` total, balance
        // still counted as active liability (it is still owed).
        editor.Summary.NotIncludedMonthlyPaymentTotal.Should().Be(creditCard.MonthlyPayment);
        editor.Summary.IncludedMonthlyPaymentTotal
            .Should().Be(editor.Rows.Where(r => r.Group == BudgetMonthDebtEditorGroups.Active).Sum(r => r.MonthlyPayment));
        editor.Summary.ActiveLiabilityBalanceTotal
            .Should().Be(editor.Rows
                .Where(r => r.Group is BudgetMonthDebtEditorGroups.Active or BudgetMonthDebtEditorGroups.Skipped)
                .Sum(r => r.Balance));
    }

    // ----------------------------------------------------------------- paidOff

    [Fact]
    public async Task GetEditor_MarkedPaidOff_AppearsInPaidGroup_NotInActiveTotals()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        var paid = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.MarkPaidOffHandler.Handle(
                new MarkBudgetMonthDebtPaidOffCommand(
                    seed.Persoid, "2026-01", creditCard.Id,
                    SetBalanceToZero: true, Note: null),
                CancellationToken.None));
        paid.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var paidRow = editor.Rows.Single(r => r.Id == creditCard.Id);

        paidRow.Group.Should().Be(BudgetMonthDebtEditorGroups.Paid);
        paidRow.SourceLifecycleStatus.Should().Be(DebtSourceLifecycleStatuses.PaidOff);
        paidRow.Balance.Should().Be(0m, "SetBalanceToZero drove the balance through the PR 3 path");

        editor.Summary.PaidOffCount.Should().Be(1);
        editor.Summary.PaidOffBalanceTotal.Should().Be(0m);
        editor.Summary.IncludedMonthlyPaymentTotal
            .Should().Be(editor.Rows.Where(r => r.Group == BudgetMonthDebtEditorGroups.Active).Sum(r => r.MonthlyPayment));
    }

    // ----------------------------------------------------------------- archived

    [Fact]
    public async Task GetEditor_Archived_AppearsInArchivedGroup_NotInActiveTotals()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        var arch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ArchiveHandler.Handle(
                new ArchiveBudgetMonthDebtCommand(
                    seed.Persoid, "2026-01", creditCard.Id, Note: null),
                CancellationToken.None));
        arch.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var archivedRow = editor.Rows.Single(r => r.Id == creditCard.Id);

        archivedRow.Group.Should().Be(BudgetMonthDebtEditorGroups.Archived);
        archivedRow.SourceLifecycleStatus.Should().Be(DebtSourceLifecycleStatuses.Archived);
        archivedRow.Balance.Should().BeGreaterThan(0m, "archive never zeroes balance");

        editor.Summary.ArchivedCount.Should().Be(1);
        editor.Summary.ArchivedBalanceTotal.Should().Be(creditCard.Balance);
        editor.Summary.ActiveLiabilityBalanceTotal
            .Should().NotBe(editor.Summary.ArchivedBalanceTotal,
                "archived rows never contribute to active liability total");
    }

    // ------------------------------------------------------------ row filtering

    [Fact]
    public async Task GetEditor_HidesRemovedAndLegacyDeletedRows_ByDefault()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var legacyRows = await GetLegacyRowsAsync(sut, seed.Persoid);
        var target = legacyRows.First(r => r.Name == "Credit Card");

        // Drop the row to month-only first, then remove it (source-linked
        // rows are rejected by the Remove handler with `RemoveBlockedForSourceLinked`).
        await DetachSourceLinkAsync(target.Id);
        var rm = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.RemoveHandler.Handle(
                new RemoveBudgetMonthDebtCommand(
                    seed.Persoid, "2026-01", target.Id, Note: null),
                CancellationToken.None));
        rm.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        editor.Rows.Should().NotContain(r => r.Id == target.Id,
            "removed rows are hidden from the default editor read");
    }

    [Fact]
    public async Task GetEditor_HidesSourceDeletedRows_AndExcludesThemFromAllSummaries()
    {
        // Regression for the review finding: a source-linked row whose
        // `Debt.Status = 'deleted'` was falling through to the `active`
        // group (no precedence rule for `deleted`) and contributing to
        // `IncludedMonthlyPaymentTotal` and `ActiveLiabilityBalanceTotal`.
        // The dashboard's `BudgetMonthDashboardRepository.DebtsSql` /
        // `TotalDebtBalance` clauses filter source-deleted rows out, so
        // PR 5's "dashboard and editor summaries reconcile" contract
        // broke for this supported terminal lifecycle. The editor SQL
        // now mirrors the dashboard filter and hides these rows entirely.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        // Baseline reads of the not-yet-deleted state.
        var editorBefore = await GetEditorAsync(sut, seed.Persoid);
        var baselineIncluded = editorBefore.Summary.IncludedMonthlyPaymentTotal;
        var baselineLiability = editorBefore.Summary.ActiveLiabilityBalanceTotal;

        // Move the source to the terminal `deleted` lifecycle. There is no
        // command path that writes `deleted` yet (PR 4 covers paidOff /
        // archived / restore / remove), so we set the column directly —
        // this is exactly the state a future delete command would produce.
        await SetSourceStatusAsync(creditCard.SourceDebtId!.Value, DebtSourceLifecycleStatuses.Deleted);

        var editor = await GetEditorAsync(sut, seed.Persoid);

        editor.Rows.Should().NotContain(r => r.Id == creditCard.Id,
            "source-deleted rows are hidden from the editor read, matching the dashboard filter");

        // Summaries drop by exactly the deleted row's contribution.
        editor.Summary.IncludedMonthlyPaymentTotal
            .Should().Be(baselineIncluded - creditCard.MonthlyPayment,
                "deleted row's planned payment must not contribute to included payment total");
        editor.Summary.ActiveLiabilityBalanceTotal
            .Should().Be(baselineLiability - creditCard.Balance,
                "deleted row's balance must not contribute to active liability total");

        // Reconciles with the dashboard SQL's filter exactly — the test
        // helper queries the same shape `BudgetMonthDashboardRepository.DebtsSql`
        // applies, so a future SQL drift will fail this assertion as well.
        editor.Summary.IncludedMonthlyPaymentTotal
            .Should().Be(await SumDashboardDebtPaymentsAsync(await GetCurrentBudgetMonthIdAsync()));
    }

    // ------------------------------------------------------- month-only row DTO

    [Fact]
    public async Task GetEditor_MonthOnlyRow_HasNullSourceValues_AndCorrectPermissions()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var target = rowsBefore.First(r => r.Name == "Credit Card");
        await DetachSourceLinkAsync(target.Id);

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var row = editor.Rows.Single(r => r.Id == target.Id);

        row.IsMonthOnly.Should().BeTrue();
        row.SourceDebtId.Should().BeNull();
        row.SourceBalance.Should().BeNull();
        row.SourceApr.Should().BeNull();
        row.SourceMonthlyPayment.Should().BeNull();
        row.SourceLifecycleStatus.Should().BeNull();
        row.Group.Should().Be(BudgetMonthDebtEditorGroups.Active);

        // Month-only rows: editing month-side is fine, plan scopes never
        // available, remove is permitted (the dedicated month-only path),
        // archive / paid-off / restore reject month-only rows.
        row.Actions.CanEditPayment.Should().BeTrue();
        row.Actions.CanEditDetails.Should().BeTrue();
        row.Actions.CanUpdateBalance.Should().BeTrue();
        row.Actions.CanSkipThisMonth.Should().BeTrue();
        row.Actions.CanIncludeThisMonth.Should().BeFalse("already included");
        row.Actions.CanRemove.Should().BeTrue();
        row.Actions.CanArchive.Should().BeFalse();
        row.Actions.CanMarkPaidOff.Should().BeFalse();
        row.Actions.CanRestore.Should().BeFalse();
        row.Actions.CanUpdatePlan.Should().BeFalse();
        row.DisabledReasons.Should().Contain(BudgetMonthDebtEditorDisabledReasons.MonthOnlyNoPlan);
    }

    // ------------------------------------------------------ closed-month gating

    [Theory]
    [InlineData(BudgetMonthStatuses.Closed)]
    [InlineData(BudgetMonthStatuses.Skipped)]
    public async Task GetEditor_NonOpenMonth_IsReadOnly_AndDisablesEveryAction(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        await MarkMonthStatusAsync("2026-01", status);

        var editor = await GetEditorAsync(sut, seed.Persoid);

        editor.MonthStatus.Should().Be(status);
        editor.IsReadOnly.Should().BeTrue();

        editor.Rows.Should().NotBeEmpty();
        foreach (var row in editor.Rows)
        {
            row.Actions.CanEditPayment.Should().BeFalse();
            row.Actions.CanEditDetails.Should().BeFalse();
            row.Actions.CanUpdateBalance.Should().BeFalse();
            row.Actions.CanSkipThisMonth.Should().BeFalse();
            row.Actions.CanIncludeThisMonth.Should().BeFalse();
            row.Actions.CanMarkPaidOff.Should().BeFalse();
            row.Actions.CanArchive.Should().BeFalse();
            row.Actions.CanRestore.Should().BeFalse();
            row.Actions.CanRemove.Should().BeFalse();
            // Regression for the review finding: `CanUpdatePlan` was once
            // gated only on row shape (`!IsMonthOnly && source = active`),
            // which leaked `true` on a closed/skipped month and would have
            // let PR 7's scope cards stay enabled while the underlying
            // edit/balance commands were already rejecting. Every action
            // flag must follow the same closed/skipped-month gating.
            row.Actions.CanUpdatePlan.Should().BeFalse();
            row.DisabledReasons.Should().Contain(c =>
                c == BudgetMonthDebtEditorDisabledReasons.MonthClosed ||
                c == BudgetMonthDebtEditorDisabledReasons.MonthSkipped);
        }
    }

    // --------------------------------------------- permission ↔ command parity

    [Fact]
    public async Task GetEditor_PermissionsMatchCommandGuards_ForSourceLifecycleTerminations()
    {
        // After mark-paid-off, every action that targets that row should be
        // blocked except the actions that *would* succeed against a paid-off
        // source. The handler's guards are authoritative; the resolver
        // mirrors them. This test verifies the mirror, catching drift if a
        // future PR loosens or tightens a guard.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        var paid = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.MarkPaidOffHandler.Handle(
                new MarkBudgetMonthDebtPaidOffCommand(
                    seed.Persoid, "2026-01", creditCard.Id,
                    SetBalanceToZero: false, Note: null),
                CancellationToken.None));
        paid.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var paidRow = editor.Rows.Single(r => r.Id == creditCard.Id);

        paidRow.Actions.CanEditPayment.Should().BeFalse();
        paidRow.Actions.CanEditDetails.Should().BeFalse();
        paidRow.Actions.CanUpdateBalance.Should().BeFalse();
        paidRow.Actions.CanSkipThisMonth.Should().BeFalse(
            "skip requires participation = included; paid-off flips it to notIncluded");
        paidRow.Actions.CanMarkPaidOff.Should().BeFalse("AlreadyPaidOff guard");
        paidRow.Actions.CanArchive.Should().BeFalse("source must be active");
        paidRow.Actions.CanRestore.Should().BeFalse("restore only from archived");
        paidRow.Actions.CanRemove.Should().BeFalse("source-linked rows reject remove");
        paidRow.DisabledReasons.Should().Contain(BudgetMonthDebtEditorDisabledReasons.SourcePaidOff);
    }

    // ---------------------------------------------------------------- progress

    [Fact]
    public async Task GetEditor_ProgressIsNull_WhenNoBalanceEventsExist()
    {
        await _db.ResetAsync();
        await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var seedRef = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seedRef.Persoid);

        var editor = await GetEditorAsync(sut, seedRef.Persoid);

        editor.Rows.Should().OnlyContain(r => r.Progress == null,
            "no DebtBalanceEvent rows exist for any seeded row — progress must be null, not synthesised");
    }

    [Fact]
    public async Task GetEditor_ProgressIsPopulated_WhenBalanceEventsExist()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");
        var originalBalance = creditCard.Balance; // 10000m from seed

        // Real PR 3 balance adjustment — writes a typed DebtBalanceEvent row.
        var adj = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BalanceHandler.Handle(
                new AdjustBudgetMonthDebtBalanceCommand(
                    seed.Persoid, "2026-01", creditCard.Id,
                    NewBalance: 7000m,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan,
                    Note: "lender statement"),
                CancellationToken.None));
        adj.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);
        var row = editor.Rows.Single(r => r.Id == creditCard.Id);

        row.Progress.Should().NotBeNull("balance event exists for this row");
        row.Progress!.CurrentBalance.Should().Be(7000m);
        row.Progress.FirstBalance.Should().Be(originalBalance);
        row.Progress.TotalPaidDelta.Should().Be(originalBalance - 7000m);
        row.Progress.PercentPaid.Should().NotBeNull();
        row.Progress.EventCount.Should().BeGreaterOrEqualTo(1);
        row.Progress.FirstEventAt.Should().NotBe(default(DateTime));
        row.Progress.LastEventAt.Should().NotBe(default(DateTime));
    }

    // ------------------------------------------------------------ recent events

    [Fact]
    public async Task GetEditor_RecentEvents_IncludeLifecycleAction_WithExtractedActionString()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var rowsBefore = await GetLegacyRowsAsync(sut, seed.Persoid);
        var creditCard = rowsBefore.First(r => r.Name == "Credit Card");

        var arch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.ArchiveHandler.Handle(
                new ArchiveBudgetMonthDebtCommand(
                    seed.Persoid, "2026-01", creditCard.Id, Note: null),
                CancellationToken.None));
        arch.IsFailure.Should().BeFalse();

        var editor = await GetEditorAsync(sut, seed.Persoid);

        editor.RecentEvents.Should().NotBeEmpty();
        var archiveEvent = editor.RecentEvents.First(e => e.EntityId == creditCard.Id);
        archiveEvent.EntityType.Should().Be("debt");
        // PR 4 handlers write `action` into ChangeSetJson; the read SQL
        // extracts it via JSON_UNQUOTE so the application never parses JSON.
        archiveEvent.Action.Should().Be("archive");
    }

    // ===================================================== helpers (PR 5 only)

    private async Task<Backend.Application.DTO.Budget.Months.Editor.Debt.BudgetMonthDebtEditorDto> GetEditorAsync(
        Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.EditorHandler.Handle(
                new GetBudgetMonthDebtEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<IReadOnlyList<Backend.Application.DTO.Budget.Months.Editor.Debt.BudgetMonthDebtEditorRowDto>> GetLegacyRowsAsync(
        Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.LegacyGetHandler.Handle(
                new GetBudgetMonthDebtsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<decimal> SumDashboardDebtPaymentsAsync(Guid budgetMonthId)
    {
        // Mirrors `BudgetMonthDashboardRepository.DebtsSql`'s filter exactly.
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<decimal>("""
            SELECT COALESCE(SUM(d.MonthlyPayment), 0)
            FROM BudgetMonthDebt d
            LEFT JOIN Debt src ON src.Id = d.SourceDebtId
            WHERE d.BudgetMonthId = @id
              AND d.IsDeleted = 0
              AND d.ParticipationStatus = 'included'
              AND (src.Id IS NULL OR src.Status = 'active');
        """, new { id = budgetMonthId });
    }

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
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

    private async Task DetachSourceLinkAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthDebt
            SET SourceDebtId = NULL
            WHERE Id = @id;
        """, new { id = monthDebtId });
    }

    private async Task SetSourceStatusAsync(Guid debtId, string status)
    {
        // No command path writes `Debt.Status = 'deleted'` yet — PR 4 covers
        // paidOff / archived / restore / remove only. Tests that need a
        // source in a terminal lifecycle state seed it directly via SQL.
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE Debt SET Status = @status WHERE Id = @id;
        """, new { id = debtId, status });
    }

    private async Task<Guid> GetCurrentBudgetMonthIdAsync()
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<Guid>("""
            SELECT Id FROM BudgetMonth WHERE YearMonth = '2026-01' LIMIT 1;
        """);
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtEditorQueryHandler EditorHandler { get; init; }
        public required GetBudgetMonthDebtsQueryHandler LegacyGetHandler { get; init; }
        public required SetBudgetMonthDebtParticipationCommandHandler ParticipationHandler { get; init; }
        public required MarkBudgetMonthDebtPaidOffCommandHandler MarkPaidOffHandler { get; init; }
        public required ArchiveBudgetMonthDebtCommandHandler ArchiveHandler { get; init; }
        public required RestoreBudgetMonthDebtCommandHandler RestoreHandler { get; init; }
        public required RemoveBudgetMonthDebtCommandHandler RemoveHandler { get; init; }
        public required AdjustBudgetMonthDebtBalanceCommandHandler BalanceHandler { get; init; }
    }

    private Sut CreateSut(DateTime utcNow)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);
        ITimeProvider time = new FakeTimeProvider(utcNow);

        var monthsRepo = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);
        var seedSourceRepo = new BudgetMonthSeedSourceRepository(uow, NullLogger<BudgetMonthSeedSourceRepository>.Instance, dbOpts);
        var materializationRepo = new BudgetMonthMaterializationRepository(uow, NullLogger<BudgetMonthMaterializationRepository>.Instance, dbOpts);
        var materializer = new BudgetMonthMaterializer(seedSourceRepo, materializationRepo, time);
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
            EditorHandler = new GetBudgetMonthDebtEditorQueryHandler(lifecycle, debtsRepo),
            LegacyGetHandler = new GetBudgetMonthDebtsQueryHandler(lifecycle, debtsRepo),
            ParticipationHandler = new SetBudgetMonthDebtParticipationCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, TimeProvider.System),
            MarkPaidOffHandler = new MarkBudgetMonthDebtPaidOffCommandHandler(
                lifecycle, debtsRepo, balanceEventRepo, changeEventRepo, TimeProvider.System),
            ArchiveHandler = new ArchiveBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, TimeProvider.System),
            RestoreHandler = new RestoreBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, TimeProvider.System),
            RemoveHandler = new RemoveBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, TimeProvider.System),
            BalanceHandler = new AdjustBudgetMonthDebtBalanceCommandHandler(
                lifecycle, debtsRepo, balanceEventRepo, changeEventRepo, TimeProvider.System),
        };
    }
}

