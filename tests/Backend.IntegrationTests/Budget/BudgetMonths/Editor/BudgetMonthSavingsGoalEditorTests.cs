using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;
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
public sealed class BudgetMonthSavingsGoalEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthSavingsGoalEditorTests(MariaDbFixture db) => _db = db;

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
    public async Task GetSavingsGoals_ReturnsMaterializedActiveGoals()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var rows = await GetRowsAsync(sut, seed.Persoid);

        rows.Should().NotBeEmpty();
        rows.Should().Contain(r => r.Name == "Emergency fund");
        rows.Should().OnlyContain(r => r.Id != Guid.Empty);
        rows.Should().OnlyContain(r => r.CanUpdateDefault);
    }

    [Fact]
    public async Task PatchSavingsGoal_CurrentMonthOnly_UpdatesMonthRowOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var baselineBefore = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    2222m,
                    BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.MonthlyContribution.Should().Be(2222m);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId.Value);
        baselineAfter!.MonthlyContribution.Should().Be(baselineBefore!.MonthlyContribution);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchSavingsGoal_CurrentMonthAndPlan_UpdatesMonthAndBaseline()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    1800m,
                    BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.MonthlyContribution.Should().Be(1800m);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.MonthlyContribution.Should().Be(1800m);
    }

    [Fact]
    public async Task PatchSavingsGoal_BudgetPlanOnly_UpdatesBaselineOnly()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var monthBefore = await GetMonthSavingsGoalAsync(target.Id);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    3000m,
                    BudgetMonthSavingsGoalEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.MonthlyContribution.Should().Be(monthBefore!.MonthlyContribution);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.MonthlyContribution.Should().Be(3000m);
    }

    [Fact]
    public async Task BulkPatch_IsAllOrNothing_WhenAnyRowFails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var before = await GetMonthSavingsGoalAsync(target.Id);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthSavingsGoalsBulkCommand.Row(
                            target.Id,
                            5555m,
                            BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthSavingsGoalsBulkCommand.Row(
                            Guid.NewGuid(),
                            1m,
                            BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        var after = await GetMonthSavingsGoalAsync(target.Id);
        after!.MonthlyContribution.Should().Be(before!.MonthlyContribution);
    }

    [Fact]
    public async Task BulkPatch_WritesOneAuditEventPerChangedRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthSavingsGoalsBulkCommand.Row(
                            target.Id,
                            target.MonthlyContribution + 100m,
                            BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task Mutations_AreRejected_WhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    target.MonthlyContribution + 1m),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task MonthOnlyRow_RejectsBudgetPlanScopes()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await DetachSourceLinkAsync(target.Id);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    2000m,
                    BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task CreateSavingsGoal_InsertsBaseline_AndMonthRow_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Name: "House deposit",
                    TargetAmount: 50000m,
                    TargetDate: new DateOnly(2027, 06, 30),
                    AmountSaved: 1000m,
                    MonthlyContribution: 750m),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value.Should().NotBeNull();
        create.Value!.Name.Should().Be("House deposit");
        create.Value.TargetAmount.Should().Be(50000m);
        create.Value.AmountSaved.Should().Be(1000m);
        create.Value.MonthlyContribution.Should().Be(750m);
        create.Value.Status.Should().Be("active");
        create.Value.IsMonthOnly.Should().BeFalse();
        create.Value.CanUpdateDefault.Should().BeTrue();
        create.Value.SourceSavingsGoalId.Should().NotBeNull();

        var monthRow = await GetMonthSavingsGoalAsync(create.Value.Id);
        monthRow!.Name.Should().Be("House deposit");
        monthRow.MonthlyContribution.Should().Be(750m);
        monthRow.Status.Should().Be("active");

        var baselineRow = await GetBaselineSavingsGoalAsync(create.Value.SourceSavingsGoalId!.Value);
        baselineRow!.Name.Should().Be("House deposit");
        baselineRow.MonthlyContribution.Should().Be(750m);

        var rows = await GetRowsAsync(sut, seed.Persoid);
        rows.Should().Contain(r => r.Id == create.Value.Id && r.Name == "House deposit");

        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
    }

    [Fact]
    public async Task CreateSavingsGoal_DefaultsAmountSavedToZero_WhenOmitted()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var targetDate = new DateOnly(2027, 03, 31);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Name: "Travel fund",
                    TargetAmount: 5000m,
                    TargetDate: targetDate,
                    AmountSaved: null,
                    MonthlyContribution: 0m),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.AmountSaved.Should().Be(0m);
        create.Value.MonthlyContribution.Should().Be(0m);
        create.Value.TargetDate.Should().Be(targetDate.ToDateTime(TimeOnly.MinValue));
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task CreateSavingsGoal_IsRejected_WhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        await MarkMonthStatusAsync("2026-01", status);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Name: "Should not be created",
                    TargetAmount: 1000m,
                    TargetDate: new DateOnly(2027, 03, 31),
                    AmountSaved: null,
                    MonthlyContribution: 100m),
                CancellationToken.None));

        create.IsFailure.Should().BeTrue();
        create.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task CreateSavingsGoal_DoesNotLeakAcrossUsers()
    {
        await _db.ResetAsync();
        var ownSeed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, ownSeed.Persoid);

        var attackerPersoid = Guid.NewGuid();

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthSavingsGoalCommand(
                    Persoid: attackerPersoid,
                    YearMonth: "2026-01",
                    Name: "Hostile goal",
                    TargetAmount: 1000m,
                    TargetDate: new DateOnly(2027, 03, 31),
                    AmountSaved: null,
                    MonthlyContribution: 100m),
                CancellationToken.None));

        create.IsFailure.Should().BeTrue();

        var rowsForOwner = await GetRowsAsync(sut, ownSeed.Persoid);
        rowsForOwner.Should().NotContain(r => r.Name == "Hostile goal");
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_UpdatesBaseline_And_CurrentMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var newTargetDate = new DateOnly(2028, 04, 30);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan,
                    TargetDate: newTargetDate),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetDate.Should().Be(newTargetDate.ToDateTime(TimeOnly.MinValue));

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.TargetDate.Should().Be(newTargetDate.ToDateTime(TimeOnly.MinValue));

        // Date-only change: one audit event with TargetDate in before/after,
        // but no MonthlyContribution field because contribution is unchanged.
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
        var changeSet = await GetLatestChangeSetAsync(budgetMonthId);
        changeSet.Should().Contain("\"TargetDate\"");
        changeSet.Should().NotContain("\"MonthlyContribution\"");
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_Ignored_When_Scope_Is_CurrentMonthOnly()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var monthBefore = await GetMonthSavingsGoalAsync(target.Id);
        var baselineBefore = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);

        // Same contribution + a "new" date, but with scope=currentMonthOnly. The
        // date must be ignored so source/current/cascade do not silently diverge.
        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly,
                    TargetDate: new DateOnly(2028, 04, 30)),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetDate.Should().Be(monthBefore!.TargetDate);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId.Value);
        baselineAfter!.TargetDate.Should().Be(baselineBefore!.TargetDate);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_Ignored_When_Scope_Is_BudgetPlanOnly()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var monthBefore = await GetMonthSavingsGoalAsync(target.Id);
        var baselineBefore = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.BudgetPlanOnly,
                    TargetDate: new DateOnly(2028, 04, 30)),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetDate.Should().Be(monthBefore!.TargetDate);

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId.Value);
        baselineAfter!.TargetDate.Should().Be(baselineBefore!.TargetDate);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    /// <summary>
    /// User-repro guard. The frontend at /dashboard/savings posts the exact
    /// payload below and the user saw the source SavingsGoal.TargetDate
    /// stay at its old value. This test asserts the full chain from
    /// command (which mirrors the deserialized DTO) all the way down to
    /// the source SavingsGoal row in the database. If this passes but a
    /// running server doesn't, the server binaries are stale.
    /// </summary>
    [Fact]
    public async Task PatchSavingsGoal_UserRepro_2339_2026_12_01_Persists_TargetDate_To_Source_Table()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        // Mirror the user's wall clock: target date 2026-12-01 must be in the
        // future relative to the SUT's "now".
        var sut = CreateSut(new DateTime(2026, 05, 19, 12, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        // Force the existing target date to the user's pre-state.
        await SetSourceAndMonthTargetDateAsync(
            target.Id,
            target.SourceSavingsGoalId!.Value,
            new DateTime(2028, 04, 01, 0, 0, 0, DateTimeKind.Utc));

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: 2339m,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan,
                    TargetDate: new DateOnly(2026, 12, 1)),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        // 1. Source plan row must move to the new date.
        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId.Value);
        baselineAfter!.TargetDate.Should().Be(
            new DateTime(2026, 12, 1, 0, 0, 0, DateTimeKind.Unspecified),
            "the patch must persist TargetDate to the source SavingsGoal table");

        // 2. Current-month row must also move.
        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.TargetDate.Should().Be(
            new DateTime(2026, 12, 1, 0, 0, 0, DateTimeKind.Unspecified));

        // 3. Contribution applied alongside the date in the same call.
        monthAfter.MonthlyContribution.Should().Be(2339m);
        baselineAfter.MonthlyContribution.Should().Be(2339m);

        // 4. Latest audit row mentions both fields and no stale value.
        var latest = await GetLatestChangeSetAsync(budgetMonthId);
        latest.Should().Contain("\"TargetDate\"");
        latest.Should().Contain("\"MonthlyContribution\"");
        latest.Should().Contain("2026-12-01");
        latest.Should().Contain("\"targetDateUpdated\":true");
        latest.Should().NotContain("\"after\":{\"MonthlyContribution\":2331");
    }

    [Fact]
    public async Task PatchSavingsGoal_NumericNoOp_2400_vs_2400dot00_DoesNotWriteAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        // Force the stored value to scale .00 so equality must compare by value,
        // not by string. The applier should treat 2400m == 2400.00m as a no-op.
        await SetMonthlyContributionScaleAsync(target.Id, target.SourceSavingsGoalId!.Value, 2400m);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: 2400m,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(0);
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_And_Contribution_AreAppliedInOneTransaction()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");

        var newTargetDate = new DateOnly(2027, 09, 30);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: 1800m,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan,
                    TargetDate: newTargetDate),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthSavingsGoalAsync(target.Id);
        monthAfter!.MonthlyContribution.Should().Be(1800m);
        monthAfter.TargetDate.Should().Be(newTargetDate.ToDateTime(TimeOnly.MinValue));

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        baselineAfter!.MonthlyContribution.Should().Be(1800m);
        baselineAfter.TargetDate.Should().Be(newTargetDate.ToDateTime(TimeOnly.MinValue));

        // One updated audit event covers both fields.
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_Equal_To_Existing_Is_A_NoOp_For_Plan()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        var baselineBefore = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId!.Value);
        var existingTargetDate = baselineBefore!.TargetDate;
        existingTargetDate.Should().NotBeNull();
        var existingDateOnly = DateOnly.FromDateTime(existingTargetDate!.Value);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly,
                    TargetDate: existingDateOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var baselineAfter = await GetBaselineSavingsGoalAsync(target.SourceSavingsGoalId.Value);
        baselineAfter!.TargetDate.Should().Be(existingTargetDate);
        // No 'UpdatedAt' bump on the baseline beyond the read fields we surface, but
        // also: the target date should not have flipped — sanity check.
    }

    [Fact]
    public async Task PatchSavingsGoal_TargetDate_OnMonthOnlyRow_Is_Rejected()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await DetachSourceLinkAsync(target.Id);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan,
                    TargetDate: new DateOnly(2028, 04, 30)),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonthSavingsGoalErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Theory]
    [InlineData("closed")]
    [InlineData("skipped")]
    public async Task PatchSavingsGoal_TargetDate_Rejected_WhenMonthIsNotOpen(string status)
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(r => r.Name == "Emergency fund");
        await MarkMonthStatusAsync("2026-01", status);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthSavingsGoalCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    MonthSavingsGoalId: target.Id,
                    MonthlyContribution: target.MonthlyContribution,
                    Scope: BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly,
                    TargetDate: new DateOnly(2028, 04, 30)),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
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
            SELECT Id, Name, MonthlyContribution, TargetDate, Status, IsDeleted
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
            SELECT Id, Name, MonthlyContribution, TargetDate, Status, FALSE AS IsDeleted
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

    private async Task SetMonthlyContributionScaleAsync(
        Guid monthSavingsGoalId,
        Guid baselineSavingsGoalId,
        decimal value)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal SET MonthlyContribution = @value WHERE Id = @id;
            UPDATE SavingsGoal SET MonthlyContribution = @value WHERE Id = @baselineId;
        """, new { value, id = monthSavingsGoalId, baselineId = baselineSavingsGoalId });
    }

    private async Task SetSourceAndMonthTargetDateAsync(
        Guid monthSavingsGoalId,
        Guid baselineSavingsGoalId,
        DateTime targetDate)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("""
            UPDATE BudgetMonthSavingsGoal SET TargetDate = @targetDate WHERE Id = @id;
            UPDATE SavingsGoal SET TargetDate = @targetDate WHERE Id = @baselineId;
        """, new { targetDate, id = monthSavingsGoalId, baselineId = baselineSavingsGoalId });
    }

    private sealed class SavingsGoalDbRow
    {
        public Guid Id { get; init; }
        public string? Name { get; init; }
        public decimal MonthlyContribution { get; init; }
        public DateTime? TargetDate { get; init; }
        public string Status { get; init; } = string.Empty;
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthSavingsGoalsQueryHandler GetHandler { get; init; }
        public required PatchBudgetMonthSavingsGoalCommandHandler PatchHandler { get; init; }
        public required PatchBudgetMonthSavingsGoalsBulkCommandHandler BulkPatchHandler { get; init; }
        public required CreateBudgetMonthSavingsGoalCommandHandler CreateHandler { get; init; }
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
            PatchHandler = new PatchBudgetMonthSavingsGoalCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System),
            BulkPatchHandler = new PatchBudgetMonthSavingsGoalsBulkCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System),
            CreateHandler = new CreateBudgetMonthSavingsGoalCommandHandler(
                lifecycle,
                savingsRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
