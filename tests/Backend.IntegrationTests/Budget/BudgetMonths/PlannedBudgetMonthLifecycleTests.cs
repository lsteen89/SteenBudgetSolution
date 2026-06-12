using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Months.CloseBudgetMonth;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;
using Backend.Application.Features.Budgets.Months.PlanNextMonth;
using Backend.Application.Features.Budgets.Months.StartBudgetMonth;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
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
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths;

[Collection("it:db")]
public sealed class PlannedBudgetMonthLifecycleTests
{
    private readonly MariaDbFixture _db;

    public PlannedBudgetMonthLifecycleTests(MariaDbFixture db) => _db = db;

    // ------------------------------------------------------------------
    // Creation
    // ------------------------------------------------------------------

    [Fact]
    public async Task PlanNextMonth_CreatesPlannedMonth_MaterializedFromPlan_AndKeepsCurrentOpen()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));

        result.IsSuccess.Should().BeTrue();
        result.Value!.WasCreated.Should().BeTrue();
        result.Value.FromYearMonth.Should().Be("2026-04");
        result.Value.PlannedYearMonth.Should().Be("2026-05");
        result.Value.Status.Should().Be(BudgetMonthStatuses.Planned);

        var planned = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        planned.Should().NotBeNull();
        planned!.Status.Should().Be(BudgetMonthStatuses.Planned);
        planned.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.None);
        planned.CarryOverAmount.Should().BeNull();

        // Current month stays open and remains the only open month.
        var current = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        current!.Status.Should().Be(BudgetMonthStatuses.Open);
        (await CountMonthsByStatusAsync(seed.BudgetId, "open")).Should().Be(1);

        // The planned month was materialized from budget-plan rows.
        (await CountExpenseRowsAsync(planned.Id)).Should().BeGreaterThan(0);
        (await CountMonthIncomeRowsAsync(planned.Id)).Should().Be(1);
        (await CountMonthSavingsRowsAsync(planned.Id)).Should().Be(1);

        var audit = await GetLifecycleAuditRowsAsync(planned.Id);
        audit.Should().ContainSingle(x =>
            x.EventType == BudgetMonthLifecycleEventTypes.PlannedMonthCreated &&
            x.RelatedBudgetMonthId == current.Id);
    }

    [Fact]
    public async Task PlanNextMonth_SecondCall_IsIdempotent()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var first = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));
        first.IsSuccess.Should().BeTrue();
        first.Value!.WasCreated.Should().BeTrue();

        var second = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));

        second.IsSuccess.Should().BeTrue();
        second.Value!.WasCreated.Should().BeFalse();
        second.Value.PlannedYearMonth.Should().Be("2026-05");

        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-05")).Should().Be(1);
        (await CountMonthsByStatusAsync(seed.BudgetId, "planned")).Should().Be(1);
    }

    [Fact]
    public async Task PlanNextMonth_RejectsWhenFromMonthIsNotOpen()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-04",
            status: BudgetMonthStatuses.Closed,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 04, 30, 9, 0, 0, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 05, 02, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.PlannedMonthRequiresOpenFromMonth.Code);

        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-05")).Should().Be(0);
    }

    [Fact]
    public async Task PlanNextMonth_RejectsWhenFromMonthIsMissing()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.PlannedMonthRequiresOpenFromMonth.Code);
    }

    [Fact]
    public async Task PlanNextMonth_RejectsWhenNextMonthAlreadyExists()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-05",
            status: BudgetMonthStatuses.Skipped,
            openedAtUtc: new DateTime(2026, 05, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 05, 01, 9, 0, 0, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.PlannedNextMonthUnavailable.Code);

        var nextMonth = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        nextMonth!.Status.Should().Be(BudgetMonthStatuses.Skipped);
    }

    [Fact]
    public async Task DbConstraint_RejectsSecondPlannedMonthPerBudget()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.Minimal);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-05",
            status: BudgetMonthStatuses.Planned,
            openedAtUtc: new DateTime(2026, 04, 10, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var act = () => BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-06",
            status: BudgetMonthStatuses.Planned,
            openedAtUtc: new DateTime(2026, 04, 10, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        await act.Should().ThrowAsync<MySqlException>();
    }

    // ------------------------------------------------------------------
    // Promotion via close
    // ------------------------------------------------------------------

    [Fact]
    public async Task CloseMonth_PromotesPlannedMonth_PreservesEdits_AndAppliesFinalCarryOver()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var clock = new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc));
        var sut = CreateSut(clock);

        var planResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));
        planResult.IsSuccess.Should().BeTrue();

        var planned = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        planned!.Status.Should().Be(BudgetMonthStatuses.Planned);

        // Edit a planned-month row ahead of time; promotion must preserve it.
        var editedExpenseId = await UpdateOneExpenseRowAsync(planned.Id, 4242m);
        var plannedExpenseCountBefore = await CountExpenseRowsAsync(planned.Id);

        // Snapshot the budget-plan foundation table; close must not rewrite it.
        var planExpensesBefore = await GetPlanExpenseFingerprintAsync(seed.BudgetId);

        var closeResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(BudgetMonthCarryOverModes.Full)),
                CancellationToken.None));

        closeResult.IsSuccess.Should().BeTrue();

        var closedMonth = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        closedMonth!.Status.Should().Be(BudgetMonthStatuses.Closed);

        // The planned month is now the open month — same row, promoted.
        var promoted = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        promoted!.Id.Should().Be(planned.Id);
        promoted.Status.Should().Be(BudgetMonthStatuses.Open);
        (await CountMonthsByStatusAsync(seed.BudgetId, "open")).Should().Be(1);
        (await CountMonthsByStatusAsync(seed.BudgetId, "planned")).Should().Be(0);

        // Final carry-over from the close snapshot replaced the planned 'none'.
        promoted.CarryOverMode.Should().Be(BudgetMonthCarryOverModes.Full);
        promoted.CarryOverAmount.Should().Be(
            Math.Max(closedMonth.SnapshotFinalBalanceMonthly!.Value, 0m));

        // Planned edits survived; no re-materialization duplicated rows.
        (await GetExpenseAmountAsync(editedExpenseId)).Should().Be(4242m);
        (await CountExpenseRowsAsync(planned.Id)).Should().Be(plannedExpenseCountBefore);

        // Budget-plan foundation rows are untouched by the close.
        (await GetPlanExpenseFingerprintAsync(seed.BudgetId)).Should().Be(planExpensesBefore);

        // Promotion is audited; no duplicate "created" event for the month.
        var audit = await GetLifecycleAuditRowsAsync(planned.Id);
        audit.Should().ContainSingle(x =>
            x.EventType == BudgetMonthLifecycleEventTypes.PlannedMonthPromoted &&
            x.RelatedBudgetMonthId == closedMonth.Id);
        audit.Should().NotContain(x =>
            x.EventType == BudgetMonthLifecycleEventTypes.NextMonthCreated);

        closeResult.Value!.NextMonth.YearMonth.Should().Be("2026-05");
        closeResult.Value.NextMonth.Status.Should().Be(BudgetMonthStatuses.Open);
    }

    [Fact]
    public async Task CloseMonth_WithGoalCompletion_ClosesLinkedGoalRowInPlannedMonth()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var clock = new FakeTimeProvider(new DateTime(2026, 04, 23, 12, 0, 0, DateTimeKind.Utc));
        var sut = CreateSut(clock);

        // Materialize the current month so its goal row can be made completable.
        var current = await GetMonthRowAsync(seed.BudgetId, "2026-04");
        var materialized = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Materializer.MaterializeIfMissingAsync(seed.BudgetId, current!.Id, seed.UserId, CancellationToken.None));
        materialized.IsSuccess.Should().BeTrue();

        var planResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));
        planResult.IsSuccess.Should().BeTrue();

        var planned = await GetMonthRowAsync(seed.BudgetId, "2026-05");

        // Make the current month's goal row a completion candidate.
        var (monthGoalId, sourceGoalId) = await MakeGoalCompletableAsync(current!.Id);

        var closeResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CloseHandler.Handle(
                new CloseBudgetMonthCommand(
                    seed.Persoid,
                    seed.UserId,
                    "2026-04",
                    new CloseBudgetMonthRequestDto(
                        BudgetMonthCarryOverModes.None,
                        CompletedSavingsGoalIds: new[] { monthGoalId })),
                CancellationToken.None));

        closeResult.IsSuccess.Should().BeTrue();

        // The promoted month's linked goal row must not keep charging.
        var plannedGoal = await GetGoalRowBySourceAsync(planned!.Id, sourceGoalId);
        plannedGoal.Should().NotBeNull();
        plannedGoal!.Status.Should().Be("closed");
        plannedGoal.ClosedReason.Should().Be("completed");
    }

    // ------------------------------------------------------------------
    // Editor mutations (PR 6: planned months are editable; closed are not)
    // ------------------------------------------------------------------

    [Fact]
    public async Task PlannedMonth_AcceptsMonthOnlyEditorMutation_WithoutTouchingBudgetPlan()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var planResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));
        planResult.IsSuccess.Should().BeTrue();

        var baselineBefore = await GetBaselineMonthlySavingsAsync(seed.BudgetId);

        var patchResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchBaseSavingsHandler.Handle(
                new PatchBudgetMonthBaseSavingsCommand(
                    seed.Persoid,
                    "2026-05",
                    AmountMonthly: 3100m,
                    Scope: "currentMonthOnly"),
                CancellationToken.None));

        patchResult.IsSuccess.Should().BeTrue();
        patchResult.Value!.MonthlyAmount.Should().Be(3100m);

        var planned = await GetMonthRowAsync(seed.BudgetId, "2026-05");
        planned!.Status.Should().Be(BudgetMonthStatuses.Planned);
        (await GetMonthBaseSavingsAsync(planned.Id)).Should().Be(3100m);

        // Month-only scope must not write the budget-plan foundation row.
        (await GetBaselineMonthlySavingsAsync(seed.BudgetId)).Should().Be(baselineBefore);
    }

    [Fact]
    public async Task ClosedMonth_StillRejectsEditorMutation()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: "2026-03",
            status: BudgetMonthStatuses.Closed,
            openedAtUtc: new DateTime(2026, 03, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: new DateTime(2026, 03, 31, 9, 0, 0, DateTimeKind.Utc),
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var patchResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchBaseSavingsHandler.Handle(
                new PatchBudgetMonthBaseSavingsCommand(
                    seed.Persoid,
                    "2026-03",
                    AmountMonthly: 3100m,
                    Scope: "currentMonthOnly"),
                CancellationToken.None));

        patchResult.IsFailure.Should().BeTrue();
        patchResult.Error.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.MonthIsClosed.Code);
    }

    // ------------------------------------------------------------------
    // Start-month guard
    // ------------------------------------------------------------------

    [Fact]
    public async Task StartMonth_IsRejected_WhilePlannedMonthExists()
    {
        await _db.ResetAsync();

        var seed = await SeedOpenMonthAsync("2026-04");
        var sut = CreateSut(new FakeTimeProvider(new DateTime(2026, 04, 10, 12, 0, 0, DateTimeKind.Utc)));

        var planResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PlanHandler.Handle(
                new PlanNextMonthCommand(seed.Persoid, seed.UserId, "2026-04"),
                CancellationToken.None));
        planResult.IsSuccess.Should().BeTrue();

        var startResult = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.StartHandler.Handle(
                new StartBudgetMonthCommand(
                    Persoid: seed.Persoid,
                    ActorPersoid: seed.UserId,
                    Request: new StartBudgetMonthRequestDto(
                        TargetYearMonth: "2026-06",
                        CarryOverMode: BudgetMonthCarryOverModes.None,
                        CarryOverAmount: null,
                        ClosePreviousOpenMonth: true,
                        CreateSkippedMonths: true)),
                CancellationToken.None));

        startResult.IsFailure.Should().BeTrue();
        startResult.Error.Code.Should().Be(
            Backend.Domain.Errors.Budget.BudgetMonth.PlannedMonthBlocksStart.Code);

        // Nothing changed: current still open, planned still planned.
        (await GetMonthRowAsync(seed.BudgetId, "2026-04"))!.Status.Should().Be(BudgetMonthStatuses.Open);
        (await GetMonthRowAsync(seed.BudgetId, "2026-05"))!.Status.Should().Be(BudgetMonthStatuses.Planned);
        (await CountMonthsForYearMonthAsync(seed.BudgetId, "2026-06")).Should().Be(0);
    }

    // ------------------------------------------------------------------
    // SUT wiring
    // ------------------------------------------------------------------

    private PlannedMonthSut CreateSut(ITimeProvider clock)
    {
        var dbOpts = DbOptions(_db.ConnectionString);
        var uow = new UnitOfWork(dbOpts, NullLogger<UnitOfWork>.Instance);

        var months = new BudgetMonthRepository(uow, NullLogger<BudgetMonthRepository>.Instance, dbOpts);

        var monthDashRepo = new BudgetMonthDashboardRepository(
            uow,
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            clock);

        var seedSource = new BudgetMonthSeedSourceRepository(
            uow,
            NullLogger<BudgetMonthSeedSourceRepository>.Instance,
            dbOpts);

        var materializationRepo = new BudgetMonthMaterializationRepository(
            uow,
            NullLogger<BudgetMonthMaterializationRepository>.Instance,
            dbOpts);

        var materializer = new BudgetMonthMaterializer(seedSource, materializationRepo, clock);
        var lifecycle = new BudgetMonthLifecycleService(months, materializer, clock);
        IBudgetMonthlyTotalsService totals = new BudgetMonthlyTotalsService(monthDashRepo);
        var closeSnapshot = new BudgetMonthCloseSnapshotService(totals);

        var auditWriter = new BudgetAuditWriter(
            uow,
            NullLogger<BudgetAuditWriter>.Instance,
            dbOpts);

        var savingsRepo = new BudgetMonthSavingsGoalMutationRepository(
            uow,
            NullLogger<BudgetMonthSavingsGoalMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        var planHandler = new PlanNextMonthCommandHandler(months, materializer, auditWriter, clock);

        var baseSavingsRepo = new BudgetMonthBaseSavingsMutationRepository(
            uow,
            NullLogger<BudgetMonthBaseSavingsMutationRepository>.Instance,
            dbOpts);

        var patchBaseSavingsHandler = new PatchBudgetMonthBaseSavingsCommandHandler(
            lifecycle,
            baseSavingsRepo,
            changeEventRepo,
            TimeProvider.System);

        var closeHandler = new CloseBudgetMonthCommandHandler(
            months,
            lifecycle,
            monthDashRepo,
            materializer,
            closeSnapshot,
            auditWriter,
            savingsRepo,
            changeEventRepo,
            clock);

        var startHandler = new StartBudgetMonthCommandHandler(
            months,
            closeSnapshot,
            totals,
            auditWriter,
            clock,
            NullLogger<StartBudgetMonthCommandHandler>.Instance);

        return new PlannedMonthSut
        {
            Uow = uow,
            PlanHandler = planHandler,
            CloseHandler = closeHandler,
            StartHandler = startHandler,
            Materializer = materializer,
            PatchBaseSavingsHandler = patchBaseSavingsHandler
        };
    }

    private async Task<SeedResult> SeedOpenMonthAsync(string yearMonth)
    {
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);

        await SetIncomePaymentTimingAsync(_db.ConnectionString, seed.BudgetId, "dayOfMonth", 25);

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: seed.BudgetId,
            yearMonth: yearMonth,
            status: BudgetMonthStatuses.Open,
            openedAtUtc: new DateTime(2026, 04, 01, 9, 0, 0, DateTimeKind.Utc),
            createdByUserId: seed.UserId,
            closedAtUtc: null,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null);

        return seed;
    }

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
        {
            ConnectionString = cs,
            DefaultCommandTimeoutSeconds = 30
        });

    // ------------------------------------------------------------------
    // Db helpers
    // ------------------------------------------------------------------

    private async Task<BudgetMonthRow?> GetMonthRowAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<BudgetMonthRow>(
            """
            SELECT
                Id,
                YearMonth,
                Status,
                ClosedAt,
                CarryOverMode,
                CarryOverAmount,
                SnapshotFinalBalanceMonthly
            FROM BudgetMonth
            WHERE BudgetId = @budgetId
              AND YearMonth = @yearMonth
            LIMIT 1;
            """,
            new { budgetId, yearMonth });
    }

    private async Task<int> CountMonthsForYearMonthAsync(Guid budgetId, string yearMonth)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @budgetId AND YearMonth = @yearMonth;",
            new { budgetId, yearMonth });
    }

    private async Task<int> CountMonthsByStatusAsync(Guid budgetId, string status)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonth WHERE BudgetId = @budgetId AND Status = @status;",
            new { budgetId, status });
    }

    private async Task<int> CountExpenseRowsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonthExpenseItem WHERE BudgetMonthId = @budgetMonthId;",
            new { budgetMonthId });
    }

    private async Task<int> CountMonthIncomeRowsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonthIncome WHERE BudgetMonthId = @budgetMonthId;",
            new { budgetMonthId });
    }

    private async Task<decimal> GetMonthBaseSavingsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<decimal>(
            "SELECT MonthlySavings FROM BudgetMonthSavings WHERE BudgetMonthId = @budgetMonthId;",
            new { budgetMonthId });
    }

    private async Task<decimal?> GetBaselineMonthlySavingsAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<decimal?>(
            "SELECT MonthlySavings FROM Savings WHERE BudgetId = @budgetId LIMIT 1;",
            new { budgetId });
    }

    private async Task<int> CountMonthSavingsRowsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM BudgetMonthSavings WHERE BudgetMonthId = @budgetMonthId;",
            new { budgetMonthId });
    }

    private async Task<Guid> UpdateOneExpenseRowAsync(Guid budgetMonthId, decimal newAmount)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var id = await conn.ExecuteScalarAsync<Guid>(
            """
            SELECT Id
            FROM BudgetMonthExpenseItem
            WHERE BudgetMonthId = @budgetMonthId
            ORDER BY Name
            LIMIT 1;
            """,
            new { budgetMonthId });

        await conn.ExecuteAsync(
            "UPDATE BudgetMonthExpenseItem SET AmountMonthly = @newAmount, IsOverride = 1 WHERE Id = @id;",
            new { newAmount, id });

        return id;
    }

    private async Task<decimal> GetExpenseAmountAsync(Guid expenseRowId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<decimal>(
            "SELECT AmountMonthly FROM BudgetMonthExpenseItem WHERE Id = @expenseRowId;",
            new { expenseRowId });
    }

    private async Task<string> GetPlanExpenseFingerprintAsync(Guid budgetId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return (await conn.ExecuteScalarAsync<string>(
            """
            SELECT CONCAT(COUNT(*), ':', COALESCE(SUM(AmountMonthly), 0))
            FROM ExpenseItem
            WHERE BudgetId = @budgetId;
            """,
            new { budgetId }))!;
    }

    private async Task<(Guid MonthGoalId, Guid SourceGoalId)> MakeGoalCompletableAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<(Guid Id, Guid SourceSavingsGoalId)>(
            """
            SELECT g.Id, g.SourceSavingsGoalId
            FROM BudgetMonthSavingsGoal g
            JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            WHERE s.BudgetMonthId = @budgetMonthId
              AND g.Status = 'active'
              AND g.IsDeleted = 0
            ORDER BY g.SortOrder, g.CreatedAt
            LIMIT 1;
            """,
            new { budgetMonthId });

        await conn.ExecuteAsync(
            """
            UPDATE BudgetMonthSavingsGoal
            SET TargetAmount = 1000, AmountSaved = 1000
            WHERE Id = @id;
            """,
            new { id = row.Id });

        return (row.Id, row.SourceSavingsGoalId);
    }

    private async Task<GoalRow?> GetGoalRowBySourceAsync(Guid budgetMonthId, Guid sourceGoalId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<GoalRow>(
            """
            SELECT g.Id, g.Status, g.ClosedReason
            FROM BudgetMonthSavingsGoal g
            JOIN BudgetMonthSavings s ON s.Id = g.BudgetMonthSavingsId
            WHERE s.BudgetMonthId = @budgetMonthId
              AND g.SourceSavingsGoalId = @sourceGoalId
            LIMIT 1;
            """,
            new { budgetMonthId, sourceGoalId });
    }

    private async Task<IReadOnlyList<LifecycleEventRow>> GetLifecycleAuditRowsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<LifecycleEventRow>(
            """
            SELECT Id, BudgetMonthId, EventType, RelatedBudgetMonthId
            FROM BudgetMonthLifecycleEvent
            WHERE BudgetMonthId = @budgetMonthId
            ORDER BY OccurredAt, Id;
            """,
            new { budgetMonthId });

        return rows.ToList();
    }

    private static async Task SetIncomePaymentTimingAsync(
        string cs,
        Guid budgetId,
        string incomePaymentDayType,
        int? incomePaymentDay)
    {
        await using var conn = new MySqlConnection(cs);
        await conn.OpenAsync();

        await conn.ExecuteAsync(
            """
            UPDATE Income
            SET
                IncomePaymentDayType = @incomePaymentDayType,
                IncomePaymentDay = @incomePaymentDay
            WHERE BudgetId = @budgetId;
            """,
            new { budgetId, incomePaymentDayType, incomePaymentDay });
    }

    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private sealed class PlannedMonthSut
    {
        public required UnitOfWork Uow { get; init; }
        public required PlanNextMonthCommandHandler PlanHandler { get; init; }
        public required CloseBudgetMonthCommandHandler CloseHandler { get; init; }
        public required StartBudgetMonthCommandHandler StartHandler { get; init; }
        public required BudgetMonthMaterializer Materializer { get; init; }
        public required PatchBudgetMonthBaseSavingsCommandHandler PatchBaseSavingsHandler { get; init; }
    }

    private sealed class BudgetMonthRow
    {
        public Guid Id { get; init; }
        public string YearMonth { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public DateTime? ClosedAt { get; init; }
        public string CarryOverMode { get; init; } = string.Empty;
        public decimal? CarryOverAmount { get; init; }
        public decimal? SnapshotFinalBalanceMonthly { get; init; }
    }

    private sealed class GoalRow
    {
        public Guid Id { get; init; }
        public string Status { get; init; } = string.Empty;
        public string? ClosedReason { get; init; }
    }

    private sealed record LifecycleEventRow(
        Guid Id,
        Guid BudgetMonthId,
        string EventType,
        Guid? RelatedBudgetMonthId);
}
