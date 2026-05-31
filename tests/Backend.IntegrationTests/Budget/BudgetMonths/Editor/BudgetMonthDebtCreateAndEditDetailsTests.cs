using System.Text.Json;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.CreateDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Domain.Errors.Budget;
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

/// <summary>
/// Debt PR 2 — `Lägg till skuld` (create) and `Redigera uppgifter`
/// (edit metadata) end-to-end. Covers the three create / edit scopes,
/// audit shape, plan/month wiring, balance immutability, dashboard impact,
/// and rejection of closed months and PR 1 lifecycle/participation states.
/// </summary>
[Collection("it:db")]
public sealed class BudgetMonthDebtCreateAndEditDetailsTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthDebtCreateAndEditDetailsTests(MariaDbFixture db) => _db = db;

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

    private sealed class SettableTimeProvider : TimeProvider
    {
        private readonly DateTime _utcNow;
        public SettableTimeProvider(DateTime utcNow) => _utcNow = utcNow;
        public override DateTimeOffset GetUtcNow() => new(_utcNow, TimeSpan.Zero);
    }

    // ============================================================ Create

    [Fact]
    public async Task Create_CurrentMonthOnly_InsertsMonthOnlyRow_NoPlanRow_AuditFlagsCorrect()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var planBefore = await CountPlanDebtsAsync(seed.BudgetId);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(MonthOnlyCommand(seed.Persoid), CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.MonthRow.Should().NotBeNull();
        result.Value.Source.Should().BeNull();

        var row = result.Value.MonthRow!;
        row.SourceDebtId.Should().BeNull();
        row.IsMonthOnly.Should().BeTrue();
        row.CanUpdateDefault.Should().BeFalse();
        row.Balance.Should().Be(2500m);
        row.MonthlyPayment.Should().Be(300m);

        // Plan side untouched, month-only row added.
        (await CountPlanDebtsAsync(seed.BudgetId)).Should().Be(planBefore);
        var monthRow = await GetMonthDebtAsync(row.Id);
        monthRow.Should().NotBeNull();
        monthRow!.ParticipationStatus.Should().Be(BudgetMonthDebtParticipationStatuses.Included);
        monthRow.Status.Should().Be("active");
        monthRow.IsOverride.Should().Be(0);

        var audit = await GetLatestDebtChangeAsync(budgetMonthId);
        audit.Should().NotBeNull();
        audit!.ChangeType.Should().Be("created");
        var json = JsonDocument.Parse(audit.ChangeSetJson!).RootElement;
        json.GetProperty("scope").GetString().Should().Be(BudgetMonthDebtEditScopes.CurrentMonthOnly);
        json.GetProperty("monthRowCreated").GetBoolean().Should().BeTrue();
        json.GetProperty("sourceRowCreated").GetBoolean().Should().BeFalse();
        json.GetProperty("createdEntity").GetProperty("IsMonthOnly").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Create_CurrentMonthAndBudgetPlan_InsertsLinkedPlanAndMonthRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var planBefore = await CountPlanDebtsAsync(seed.BudgetId);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                LinkedCommand(seed.Persoid, BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.MonthRow.Should().NotBeNull();
        result.Value.Source.Should().NotBeNull();

        var row = result.Value.MonthRow!;
        row.SourceDebtId.Should().NotBeNull();
        row.IsMonthOnly.Should().BeFalse();
        row.CanUpdateDefault.Should().BeTrue();
        row.SourceDebtId.Should().Be(result.Value.Source!.SourceDebtId);

        (await CountPlanDebtsAsync(seed.BudgetId)).Should().Be(planBefore + 1);

        var planRow = await GetPlanDebtAsync(row.SourceDebtId!.Value);
        planRow.Should().NotBeNull();
        planRow!.Status.Should().Be(DebtSourceLifecycleStatuses.Active);
        planRow.Name.Should().Be("Privatlån");

        var audit = await GetLatestDebtChangeAsync(budgetMonthId);
        audit.Should().NotBeNull();
        var json = JsonDocument.Parse(audit!.ChangeSetJson!).RootElement;
        json.GetProperty("monthRowCreated").GetBoolean().Should().BeTrue();
        json.GetProperty("sourceRowCreated").GetBoolean().Should().BeTrue();
        json.GetProperty("createdEntity").GetProperty("IsMonthOnly").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Create_BudgetPlanOnly_InsertsPlanRow_NoMonthRow_FutureMonthsMaterialize()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var januaryMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var monthRowsBefore = await CountMonthDebtsAsync(januaryMonthId);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                LinkedCommand(seed.Persoid, BudgetMonthDebtEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value!.MonthRow.Should().BeNull();
        result.Value.Source.Should().NotBeNull();
        var sourceDebtId = result.Value.Source!.SourceDebtId;

        // Current month must not have grown.
        (await CountMonthDebtsAsync(januaryMonthId)).Should().Be(monthRowsBefore);
        var planRow = await GetPlanDebtAsync(sourceDebtId);
        planRow!.Status.Should().Be(DebtSourceLifecycleStatuses.Active);

        // Future month materializes the new plan row. The lifecycle service
        // refuses to open February while January is still open (one open
        // month at a time), so close January with a direct DB write to
        // simulate the user advancing to next month.
        await SetMonthStatusAsync(januaryMonthId, BudgetMonthStatuses.Closed);

        var februarySut = CreateSut(new DateTime(2026, 02, 03, 08, 00, 00, DateTimeKind.Utc));
        var februaryMonthId = await EnsureMonthAsync(februarySut, seed.Persoid, "2026-02");
        var februaryRowsForNewDebt = await CountMonthRowsLinkedToAsync(februaryMonthId, sourceDebtId);
        februaryRowsForNewDebt.Should().Be(1);
    }

    [Fact]
    public async Task Create_ClosedMonth_Rejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        await SetMonthStatusAsync(budgetMonthId, BudgetMonthStatuses.Closed);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(MonthOnlyCommand(seed.Persoid), CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
        (await CountMonthDebtsAsync(budgetMonthId)).Should().Be(0);
    }

    [Fact]
    public async Task Create_CurrentMonthScope_AffectsDashboardDebtPaymentTotal()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var totals = CreateTotalsService();

        var before = (await totals.ComputeAsync(budgetMonthId, CancellationToken.None))!.TotalDebtPayments;

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(MonthOnlyCommand(seed.Persoid), CancellationToken.None));
        result.IsFailure.Should().BeFalse();

        var after = (await totals.ComputeAsync(budgetMonthId, CancellationToken.None))!.TotalDebtPayments;
        after.Should().Be(before + 300m);
    }

    [Fact]
    public async Task Create_BudgetPlanOnly_DoesNotAffectCurrentMonthPaymentTotal()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var totals = CreateTotalsService();

        var before = (await totals.ComputeAsync(budgetMonthId, CancellationToken.None))!.TotalDebtPayments;

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                LinkedCommand(seed.Persoid, BudgetMonthDebtEditScopes.BudgetPlanOnly),
                CancellationToken.None));
        result.IsFailure.Should().BeFalse();

        var after = (await totals.ComputeAsync(budgetMonthId, CancellationToken.None))!.TotalDebtPayments;
        after.Should().Be(before);
    }

    // ============================================================ Edit details

    [Fact]
    public async Task EditDetails_CurrentMonthOnly_UpdatesMonthRow_NotPlan_NotBalance()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);
        var planBefore = await GetPlanDebtAsync(target.SourceDebtId!.Value);

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: "Credit Card · ny",
            Type: DebtTypes.Revolving,
            Apr: 17.5m,
            MonthlyFee: 25m,
            MinPayment: 350m,
            TermMonths: null,
            MonthlyPayment: target.MonthlyPayment + 100m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.Name.Should().Be("Credit Card · ny");
        monthAfter.Apr.Should().Be(17.5m);
        monthAfter.MonthlyFee.Should().Be(25m);
        monthAfter.MinPayment.Should().Be(350m);
        monthAfter.MonthlyPayment.Should().Be(target.MonthlyPayment + 100m);
        monthAfter.Balance.Should().Be(monthBefore!.Balance, "balance is owned by PR 3 and must never move on a detail edit");
        monthAfter.IsOverride.Should().Be(1);

        // Plan row untouched.
        var planAfter = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        planAfter!.Name.Should().Be(planBefore!.Name);
        planAfter.MonthlyPayment.Should().Be(planBefore.MonthlyPayment);
    }

    [Fact]
    public async Task EditDetails_CurrentMonthAndBudgetPlan_UpdatesBothSides_NotBalance()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "CSN");
        var planBalanceBefore = (await GetPlanDebtAsync(target.SourceDebtId!.Value))!.Balance;
        var monthBalanceBefore = (await GetMonthDebtAsync(target.Id))!.Balance;

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: "CSN · 2026",
            Type: DebtTypes.Installment,
            Apr: 1.2m,
            MonthlyFee: 0m,
            MinPayment: null,
            TermMonths: 60,
            MonthlyPayment: 220m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        var planAfter = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        monthAfter!.Name.Should().Be("CSN · 2026");
        monthAfter.TermMonths.Should().Be(60);
        monthAfter.MonthlyPayment.Should().Be(220m);
        planAfter!.Name.Should().Be("CSN · 2026");
        planAfter.TermMonths.Should().Be(60);
        planAfter.MonthlyPayment.Should().Be(220m);

        monthAfter.Balance.Should().Be(monthBalanceBefore);
        planAfter.Balance.Should().Be(planBalanceBefore);
    }

    [Fact]
    public async Task EditDetails_BudgetPlanOnly_UpdatesPlanRow_NotMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "CSN");
        var monthBefore = await GetMonthDebtAsync(target.Id);

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: "CSN · plan",
            Type: DebtTypes.Installment,
            Apr: 0.7m,
            MonthlyFee: null,
            MinPayment: null,
            TermMonths: 36,
            MonthlyPayment: 180m,
            Scope: BudgetMonthDebtEditScopes.BudgetPlanOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.Name.Should().Be(monthBefore!.Name);
        monthAfter.MonthlyPayment.Should().Be(monthBefore.MonthlyPayment);
        monthAfter.Apr.Should().Be(monthBefore.Apr);

        var planAfter = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        planAfter!.Name.Should().Be("CSN · plan");
        planAfter.MonthlyPayment.Should().Be(180m);
        planAfter.Apr.Should().Be(0.7m);
    }

    [Fact]
    public async Task EditDetails_PlanScope_RejectedForMonthOnlyRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        // Create a month-only row first.
        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(MonthOnlyCommand(seed.Persoid), CancellationToken.None));
        create.IsFailure.Should().BeFalse();
        var rowId = create.Value!.MonthRow!.Id;

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: rowId,
            Name: "Klarna · ändrad",
            Type: DebtTypes.Installment,
            Apr: 0m,
            MonthlyFee: null,
            MinPayment: null,
            TermMonths: 10,
            MonthlyPayment: 400m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Theory]
    [InlineData(DebtSourceLifecycleStatuses.PaidOff, "BudgetMonthDebt.SourceLifecycleClosed")]
    [InlineData(DebtSourceLifecycleStatuses.Archived, "BudgetMonthDebt.SourceLifecycleClosed")]
    [InlineData(DebtSourceLifecycleStatuses.Deleted, "BudgetMonthDebt.SourceLifecycleClosed")]
    public async Task EditDetails_RejectsTerminatedSourceLifecycle(string lifecycle, string expectedCode)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetSourceLifecycleAsync(target.SourceDebtId!.Value, lifecycle);

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: "x",
            Type: target.Type,
            Apr: target.Apr,
            MonthlyFee: target.MonthlyFee,
            MinPayment: target.MinPayment ?? 300m,
            TermMonths: target.TermMonths,
            MonthlyPayment: target.MonthlyPayment,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(expectedCode);
    }

    [Theory]
    [InlineData(BudgetMonthDebtParticipationStatuses.NotIncluded, "BudgetMonthDebt.RowNotIncluded")]
    [InlineData(BudgetMonthDebtParticipationStatuses.Removed, "BudgetMonthDebt.RowRemoved")]
    public async Task EditDetails_RejectsNonIncludedParticipation(string participation, string expectedCode)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetParticipationAsync(target.Id, participation);

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: target.Name,
            Type: target.Type,
            Apr: target.Apr,
            MonthlyFee: target.MonthlyFee,
            MinPayment: target.MinPayment ?? 300m,
            TermMonths: target.TermMonths,
            MonthlyPayment: target.MonthlyPayment + 50m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(expectedCode);
    }

    // ---- No-op behavior ----------------------------------------------------
    //
    // Detail patches that submit identical values must mirror the
    // planned-payment path: no DB update, no audit, no `IsOverride` bump.
    // The planned-payment applier already gates on real changes — these
    // tests pin the same behavior for the metadata route so a UI re-submit
    // (e.g. user opens the drawer, presses Save without changing anything)
    // does not pollute the change history or silently mark the month row as
    // overridden.

    [Fact]
    public async Task EditDetails_CurrentMonthOnly_NoOp_DoesNotUpdateOrAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var monthBefore = await GetMonthDebtAsync(target.Id);
        monthBefore!.IsOverride.Should().Be(0, "credit-card row is freshly materialized and has not been touched");

        var auditCountBefore = await CountDebtChangeEventsAsync(budgetMonthId);

        // Same values as `target` — pure no-op.
        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: target.Name,
            Type: target.Type,
            Apr: target.Apr,
            MonthlyFee: target.MonthlyFee,
            MinPayment: target.MinPayment,
            TermMonths: target.TermMonths,
            MonthlyPayment: target.MonthlyPayment,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        monthAfter!.IsOverride.Should().Be(0, "no-op must not flip IsOverride");
        monthAfter.Name.Should().Be(monthBefore.Name);
        monthAfter.MonthlyPayment.Should().Be(monthBefore.MonthlyPayment);

        var auditCountAfter = await CountDebtChangeEventsAsync(budgetMonthId);
        auditCountAfter.Should().Be(auditCountBefore, "no audit event is written when nothing changed");
    }

    [Fact]
    public async Task EditDetails_CurrentMonthAndBudgetPlan_NoOp_DoesNotUpdateEitherSideOrAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "CSN");
        var monthBefore = await GetMonthDebtAsync(target.Id);
        var planBefore = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        monthBefore!.IsOverride.Should().Be(0);

        var auditCountBefore = await CountDebtChangeEventsAsync(budgetMonthId);

        // Same values — both sides must be untouched.
        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: target.Name,
            Type: target.Type,
            Apr: target.Apr,
            MonthlyFee: target.MonthlyFee,
            MinPayment: target.MinPayment,
            TermMonths: target.TermMonths,
            MonthlyPayment: target.MonthlyPayment,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthDebtAsync(target.Id);
        var planAfter = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        monthAfter!.IsOverride.Should().Be(0);
        monthAfter.MonthlyPayment.Should().Be(monthBefore.MonthlyPayment);
        planAfter!.MonthlyPayment.Should().Be(planBefore!.MonthlyPayment);

        var auditCountAfter = await CountDebtChangeEventsAsync(budgetMonthId);
        auditCountAfter.Should().Be(auditCountBefore);
    }

    [Fact]
    public async Task EditDetails_CurrentMonthAndBudgetPlan_PartialNoOp_OnlyChangedSideIsAudited()
    {
        // Set up a month/plan divergence first: diverge the month row's Apr
        // via a currentMonthOnly edit. Then submit a currentMonthAndBudgetPlan
        // edit whose values match the (now diverged) month row exactly — the
        // month side must be a no-op while the plan side must catch up.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        var planBefore = await GetPlanDebtAsync(target.SourceDebtId!.Value);

        // Diverge the month row only (Apr 18.0 → 17.5).
        var divergeAprValue = target.Apr - 0.5m;
        var diverge = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(
                new PatchBudgetMonthDebtDetailsCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthDebtId: target.Id,
                    Name: target.Name,
                    Type: target.Type,
                    Apr: divergeAprValue,
                    MonthlyFee: target.MonthlyFee,
                    MinPayment: target.MinPayment,
                    TermMonths: target.TermMonths,
                    MonthlyPayment: target.MonthlyPayment,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly),
                CancellationToken.None));
        diverge.IsFailure.Should().BeFalse();

        var monthAfterDiverge = await GetMonthDebtAsync(target.Id);
        monthAfterDiverge!.Apr.Should().Be(divergeAprValue);
        var planAfterDiverge = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        planAfterDiverge!.Apr.Should().Be(planBefore!.Apr, "plan side stayed put after currentMonthOnly diverge");

        var auditCountBeforePartial = await CountDebtChangeEventsAsync(budgetMonthId);
        var monthSnapshotBeforePartial = await GetMonthDebtAsync(target.Id);

        // Now submit currentMonthAndBudgetPlan with values matching the
        // diverged month row exactly. Expected: month no-op, plan updates.
        //
        // Use a second sut anchored to a later UTC time so the partial-patch
        // audit's ChangedAt is strictly after the diverge audit's — otherwise
        // `GetLatestDebtChangeAsync` ordering is ambiguous (both events would
        // share the same fake-now value).
        var sutLater = CreateSut(new DateTime(2026, 01, 07, 09, 00, 00, DateTimeKind.Utc));
        var partial = await sutLater.Uow.InTx(CancellationToken.None, () =>
            sutLater.PatchDetailsHandler.Handle(
                new PatchBudgetMonthDebtDetailsCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthDebtId: target.Id,
                    Name: target.Name,
                    Type: target.Type,
                    Apr: divergeAprValue,
                    MonthlyFee: target.MonthlyFee,
                    MinPayment: target.MinPayment,
                    TermMonths: target.TermMonths,
                    MonthlyPayment: target.MonthlyPayment,
                    Scope: BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));
        partial.IsFailure.Should().BeFalse();

        // Plan side caught up; month side stayed where it already was.
        var planAfterPartial = await GetPlanDebtAsync(target.SourceDebtId!.Value);
        planAfterPartial!.Apr.Should().Be(divergeAprValue);

        var monthAfterPartial = await GetMonthDebtAsync(target.Id);
        monthAfterPartial!.Apr.Should().Be(divergeAprValue);
        monthAfterPartial.UpdatedAt.Should().Be(monthSnapshotBeforePartial!.UpdatedAt,
            "month side must not have been touched again by the no-op half of the patch");

        // Exactly one audit event was added; its JSON only flags the plan side.
        (await CountDebtChangeEventsAsync(budgetMonthId)).Should().Be(auditCountBeforePartial + 1);
        var latest = await GetLatestDebtChangeAsync(budgetMonthId);
        latest.Should().NotBeNull();
        var json = JsonDocument.Parse(latest!.ChangeSetJson!).RootElement;
        json.GetProperty("currentMonthUpdated").GetBoolean().Should().BeFalse();
        json.GetProperty("baselineUpdated").GetBoolean().Should().BeTrue();
        json.GetProperty("monthBefore").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("monthAfter").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task EditDetails_ClosedMonth_Rejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetEditorDtosAsync(sut, seed.Persoid)).First(r => r.Name == "Credit Card");
        await SetMonthStatusAsync(budgetMonthId, BudgetMonthStatuses.Closed);

        var cmd = new PatchBudgetMonthDebtDetailsCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            MonthDebtId: target.Id,
            Name: target.Name,
            Type: target.Type,
            Apr: target.Apr,
            MonthlyFee: target.MonthlyFee,
            MinPayment: target.MinPayment ?? 300m,
            TermMonths: target.TermMonths,
            MonthlyPayment: target.MonthlyPayment + 1m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchDetailsHandler.Handle(cmd, CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    // ============================================================ Helpers

    private static CreateBudgetMonthDebtCommand MonthOnlyCommand(Guid persoid) =>
        new(
            Persoid: persoid,
            YearMonth: "2026-01",
            Name: "Klarna – Soffa",
            Type: DebtTypes.Installment,
            Balance: 2500m,
            Apr: 0m,
            MonthlyFee: 29m,
            MinPayment: null,
            TermMonths: 10,
            MonthlyPayment: 300m,
            Scope: BudgetMonthDebtEditScopes.CurrentMonthOnly);

    private static CreateBudgetMonthDebtCommand LinkedCommand(Guid persoid, string scope) =>
        new(
            Persoid: persoid,
            YearMonth: "2026-01",
            Name: "Privatlån",
            Type: DebtTypes.Private,
            Balance: 38500m,
            Apr: 6.4m,
            MonthlyFee: 0m,
            MinPayment: 1100m,
            TermMonths: 28,
            MonthlyPayment: 1500m,
            Scope: scope);

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid, string yearMonth = "2026-01")
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, yearMonth, CancellationToken.None));
        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthDebtEditorRowDto>> GetEditorDtosAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(new GetBudgetMonthDebtsQuery(persoid, "2026-01"), CancellationToken.None));
        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task SetMonthStatusAsync(Guid budgetMonthId, string status)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync(
            "UPDATE BudgetMonth SET Status = @s WHERE Id = @id;",
            new { s = status, id = budgetMonthId });
    }

    private async Task SetParticipationAsync(Guid monthDebtId, string participation)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync(
            """
            UPDATE BudgetMonthDebt
            SET ParticipationStatus = @participation,
                IsDeleted = CASE WHEN @participation = 'removed' THEN 1 ELSE IsDeleted END
            WHERE Id = @id;
            """,
            new { id = monthDebtId, participation });
    }

    private async Task SetSourceLifecycleAsync(Guid debtId, string lifecycle)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync(
            "UPDATE Debt SET Status = @lifecycle WHERE Id = @id;",
            new { id = debtId, lifecycle });
    }

    private async Task<int> CountPlanDebtsAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM Debt WHERE BudgetId = @id;",
            new { id = budgetId });
    }

    private async Task<int> CountMonthDebtsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonthDebt WHERE BudgetMonthId = @id;",
            new { id = budgetMonthId });
    }

    private async Task<int> CountMonthRowsLinkedToAsync(Guid budgetMonthId, Guid sourceDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonthDebt WHERE BudgetMonthId = @bm AND SourceDebtId = @src;",
            new { bm = budgetMonthId, src = sourceDebtId });
    }

    private async Task<MonthDebtRow?> GetMonthDebtAsync(Guid monthDebtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<MonthDebtRow>(
            """
            SELECT
                Id, BudgetMonthId, SourceDebtId, Name, Type, Balance, Apr,
                MonthlyFee, MinPayment,
                CAST(TermMonths AS SIGNED) AS TermMonths,
                MonthlyPayment, Status, ParticipationStatus, IsDeleted, IsOverride,
                UpdatedAt
            FROM BudgetMonthDebt WHERE Id = @id;
            """,
            new { id = monthDebtId });
    }

    private async Task<int> CountDebtChangeEventsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @bm AND EntityType = 'debt';
            """,
            new { bm = budgetMonthId });
    }

    private async Task<PlanDebtRow?> GetPlanDebtAsync(Guid debtId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<PlanDebtRow>(
            """
            SELECT
                Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment,
                CAST(TermMonths AS SIGNED) AS TermMonths,
                MonthlyPayment, Status
            FROM Debt WHERE Id = @id;
            """,
            new { id = debtId });
    }

    private async Task<DebtChangeRow?> GetLatestDebtChangeAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        return await conn.QuerySingleOrDefaultAsync<DebtChangeRow>(
            """
            SELECT EntityType, EntityId, SourceEntityId, ChangeType, ChangeSetJson
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @bm AND EntityType = 'debt'
            ORDER BY ChangedAt DESC, Id DESC
            LIMIT 1;
            """,
            new { bm = budgetMonthId });
    }

    private IBudgetMonthlyTotalsService CreateTotalsService()
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var dashboardRepo = new BudgetMonthDashboardRepository(
            new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance),
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            new FakeTimeProvider(DateTime.UtcNow));
        return new BudgetMonthlyTotalsService(dashboardRepo);
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
        var materializer = new BudgetMonthMaterializer(seedSourceRepo, materializationRepo, time);
        var lifecycle = new BudgetMonthLifecycleService(monthsRepo, materializer, time);

        var debtsRepo = new BudgetMonthDebtMutationRepository(
            uow, NullLogger<BudgetMonthDebtMutationRepository>.Instance, dbOpts);
        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow, NullLogger<BudgetMonthChangeEventRepository>.Instance, dbOpts);

        var timeProvider = new SettableTimeProvider(utcNow);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthDebtsQueryHandler(lifecycle, debtsRepo),
            CreateHandler = new CreateBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, timeProvider),
            PatchDetailsHandler = new PatchBudgetMonthDebtDetailsCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, timeProvider),
            PatchPaymentHandler = new PatchBudgetMonthDebtCommandHandler(
                lifecycle, debtsRepo, changeEventRepo, timeProvider)
        };
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthDebtsQueryHandler GetHandler { get; init; }
        public required CreateBudgetMonthDebtCommandHandler CreateHandler { get; init; }
        public required PatchBudgetMonthDebtDetailsCommandHandler PatchDetailsHandler { get; init; }
        public required PatchBudgetMonthDebtCommandHandler PatchPaymentHandler { get; init; }
    }

    private sealed class MonthDebtRow
    {
        public Guid Id { get; init; }
        public Guid BudgetMonthId { get; init; }
        public Guid? SourceDebtId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Type { get; init; } = string.Empty;
        public decimal Balance { get; init; }
        public decimal Apr { get; init; }
        public decimal? MonthlyFee { get; init; }
        public decimal? MinPayment { get; init; }
        public int? TermMonths { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string Status { get; init; } = string.Empty;
        public string ParticipationStatus { get; init; } = string.Empty;
        public int IsDeleted { get; init; }
        public int IsOverride { get; init; }
        public DateTime? UpdatedAt { get; init; }
    }

    private sealed class PlanDebtRow
    {
        public Guid Id { get; init; }
        public Guid BudgetId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Type { get; init; } = string.Empty;
        public decimal Balance { get; init; }
        public decimal Apr { get; init; }
        public decimal? MonthlyFee { get; init; }
        public decimal? MinPayment { get; init; }
        public int? TermMonths { get; init; }
        public decimal MonthlyPayment { get; init; }
        public string Status { get; init; } = string.Empty;
    }

    private sealed class DebtChangeRow
    {
        public string EntityType { get; init; } = string.Empty;
        public Guid EntityId { get; init; }
        public Guid? SourceEntityId { get; init; }
        public string ChangeType { get; init; } = string.Empty;
        public string? ChangeSetJson { get; init; }
    }
}
