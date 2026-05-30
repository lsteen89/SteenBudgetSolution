using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.BudgetMonths.Services;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Income;
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
public sealed class BudgetMonthIncomeItemEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthIncomeItemEditorTests(MariaDbFixture db) => _db = db;

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
    public async Task GetIncomeItems_ReturnsSalarySideHustleAndHouseholdRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var rows = await GetRowsAsync(sut, seed.Persoid);

        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.Salary);
        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        rows.Should().Contain(x => x.Kind == BudgetMonthIncomeItemKinds.HouseholdMember);
        rows.Should().OnlyContain(x => x.Id != Guid.Empty);
    }

    [Fact]
    public async Task GetIncomeItems_ExposesSourcePlanFieldsForPlanLinkedRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var rows = await GetRowsAsync(sut, seed.Persoid);

        var salary = rows.Single(x => x.Kind == BudgetMonthIncomeItemKinds.Salary);
        salary.SourceIncomeItemId.Should().NotBeNull("materialization links salary to its plan row");
        salary.SourceName.Should().BeNull("the Income (salary) plan table has no name column");
        salary.SourceAmountMonthly.Should().Be(30000m, "the seed sets NetSalaryMonthly to 30000");
        salary.SourceIsActive.Should().BeTrue("salary is always active when the source row exists");

        var sideHustle = rows.Single(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        sideHustle.SourceIncomeItemId.Should().NotBeNull();
        sideHustle.SourceName.Should().Be("Side job");
        sideHustle.SourceAmountMonthly.Should().Be(2000m);
        sideHustle.SourceIsActive.Should().BeTrue();

        var household = rows.Single(x => x.Kind == BudgetMonthIncomeItemKinds.HouseholdMember);
        household.SourceIncomeItemId.Should().NotBeNull();
        household.SourceName.Should().Be("Partner contribution");
        household.SourceAmountMonthly.Should().Be(500m);
        household.SourceIsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetIncomeItems_ReturnsNullSourcePlanFieldsForMonthOnlyRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "One-off gig",
                    750m,
                    true),
                CancellationToken.None));
        create.IsFailure.Should().BeFalse();

        var rows = await GetRowsAsync(sut, seed.Persoid);
        var monthOnly = rows.Single(x => x.Id == create.Value!.Id);

        monthOnly.IsMonthOnly.Should().BeTrue();
        monthOnly.SourceIncomeItemId.Should().BeNull();
        monthOnly.SourceName.Should().BeNull();
        monthOnly.SourceAmountMonthly.Should().BeNull();
        monthOnly.SourceIsActive.Should().BeNull();
    }

    [Fact]
    public async Task CreateIncomeItem_WritesMonthOnlyRowAndAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Weekend job",
                    900m,
                    true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.IsMonthOnly.Should().BeTrue();
        create.Value.CanUpdateDefault.Should().BeFalse();

        var monthRow = await GetMonthIncomeRowAsync(create.Value.Id, create.Value.Kind);
        monthRow.Should().NotBeNull();
        monthRow!.Name.Should().Be("Weekend job");
        monthRow.AmountMonthly.Should().Be(900m);

        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
    }

    [Fact]
    public async Task CreateIncomeItem_CurrentMonthOnly_KeepsExistingMonthOnlyBehavior()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Explicit current-month",
                    400m,
                    true,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.IsMonthOnly.Should().BeTrue();
        create.Value.CanUpdateDefault.Should().BeFalse();
        create.Value.SourceIncomeItemId.Should().BeNull(
            "currentMonthOnly must not link to a plan row");

        // Audit: exactly one event, no plan row inserted into the side
        // hustle plan table.
        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
        (await CountPlanRowsAsync("IncomeSideHustle", "Explicit current-month")).Should().Be(0);
    }

    [Fact]
    public async Task CreateIncomeItem_CurrentMonthAndBudgetPlan_SideHustle_WritesPlanAndLinkedMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Recurring weekend job",
                    1200m,
                    true,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.IsMonthOnly.Should().BeFalse(
            "plan-linked rows must not render as 'Bara {månad}'");
        create.Value.CanUpdateDefault.Should().BeTrue();
        create.Value.SourceIncomeItemId.Should().NotBeNull(
            "the month row must link back to the new plan row");
        create.Value.SourceName.Should().Be("Recurring weekend job");
        create.Value.SourceAmountMonthly.Should().Be(1200m);
        create.Value.SourceIsActive.Should().BeTrue();

        // Month row persisted as a non-deleted, active side-hustle row.
        var monthRow = await GetMonthIncomeRowAsync(create.Value.Id, create.Value.Kind);
        monthRow.Should().NotBeNull();
        monthRow!.Name.Should().Be("Recurring weekend job");
        monthRow.AmountMonthly.Should().Be(1200m);
        monthRow.IsActive.Should().BeTrue();
        monthRow.IsDeleted.Should().BeFalse();

        // Plan row persisted under the budget's Income.Id with matching shape.
        var planRow = await GetBaselineIncomeRowAsync(create.Value.SourceIncomeItemId!.Value, create.Value.Kind);
        planRow.Should().NotBeNull();
        planRow!.Name.Should().Be("Recurring weekend job");
        planRow.AmountMonthly.Should().Be(1200m);
        planRow.IsActive.Should().BeTrue();

        // Audit: single create event, source-entity-id points to the plan row
        // so history is reviewable without joining plan tables.
        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
        (await CountChangeEventsWithSourceAsync(budgetMonthId, "created", create.Value.SourceIncomeItemId.Value))
            .Should().Be(1);

        // Re-read via the editor query: the new row must show up as a
        // plan-linked active side-hustle and surface the source-plan fields.
        var rows = await GetRowsAsync(sut, seed.Persoid);
        var created = rows.Single(x => x.Id == create.Value.Id);
        created.IsMonthOnly.Should().BeFalse();
        created.SourceIncomeItemId.Should().Be(create.Value.SourceIncomeItemId);
        created.SourceName.Should().Be("Recurring weekend job");
        created.SourceAmountMonthly.Should().Be(1200m);
        created.SourceIsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateIncomeItem_CurrentMonthAndBudgetPlan_HouseholdMember_WritesPlanAndLinkedMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.HouseholdMember,
                    "Roommate share",
                    800m,
                    true,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value!.Kind.Should().Be(BudgetMonthIncomeItemKinds.HouseholdMember);
        create.Value.IsMonthOnly.Should().BeFalse();
        create.Value.CanUpdateDefault.Should().BeTrue();

        // Plan row landed in IncomeHouseholdMember, not IncomeSideHustle.
        (await CountPlanRowsAsync("IncomeHouseholdMember", "Roommate share")).Should().Be(1);
        (await CountPlanRowsAsync("IncomeSideHustle", "Roommate share")).Should().Be(0);

        (await CountChangeEventsAsync(budgetMonthId, "created")).Should().Be(1);
    }

    [Fact]
    public async Task CreateIncomeItem_CurrentMonthAndBudgetPlan_WithInactiveMonth_KeepsPlanRowActiveGoingForward()
    {
        // Contract: scope = "is this also part of the plan going forward?".
        // The active toggle = "does it count in THIS month?". They must not
        // collapse. When a user adds a new recurring income and unchecks
        // "Räknas i månaden", the plan row must stay active so the
        // materializer pulls it into next month. The current-month row is
        // the one that records the user's "not this month" choice.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Recurring but skip Jan",
                    1500m,
                    IsActive: false,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();

        // Response: row is linked, plan-editable, but inactive this month.
        create.Value!.IsMonthOnly.Should().BeFalse();
        create.Value.CanUpdateDefault.Should().BeTrue();
        create.Value.SourceIncomeItemId.Should().NotBeNull();
        create.Value.IsActive.Should().BeFalse(
            "the active toggle controls current-month inclusion");
        create.Value.SourceIsActive.Should().BeTrue(
            "the plan row must stay active so the materializer pulls it forward");

        // Month row physically inactive — confirms it won't bump the
        // current month's income total.
        var monthRow = await GetMonthIncomeRowAsync(create.Value.Id, create.Value.Kind);
        monthRow.Should().NotBeNull();
        monthRow!.IsActive.Should().BeFalse();
        monthRow.IsDeleted.Should().BeFalse();

        // Plan row physically active — confirms materializer will pull it
        // into future months (the existing materializer filters on
        // `IncomeSideHustle.IsActive = 1 AND EndedAt IS NULL`).
        var planRow = await GetBaselineIncomeRowAsync(create.Value.SourceIncomeItemId!.Value, create.Value.Kind);
        planRow.Should().NotBeNull();
        planRow!.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateIncomeItem_CurrentMonthAndBudgetPlan_IsRejected_WhenMonthIsClosed()
    {
        // Closed/skipped guard must still fire before any plan-row insert
        // happens — otherwise a closed month could grow new plan rows
        // through the create endpoint.
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        await MarkMonthStatusAsync("2026-01", "closed");

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Should fail",
                    100m,
                    true,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        create.IsFailure.Should().BeTrue();
        create.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
        (await CountPlanRowsAsync("IncomeSideHustle", "Should fail")).Should().Be(0);
    }

    [Fact]
    public async Task PatchIncomeItem_CurrentMonthOnly_UpdatesMonthRowOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var baselineBefore = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Month side job",
                    2100m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter!.Name.Should().Be("Month side job");
        monthAfter.AmountMonthly.Should().Be(2100m);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId.Value, target.Kind);
        baselineAfter.Should().BeEquivalentTo(baselineBefore);
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchIncomeItem_CurrentMonthAndBudgetPlan_UpdatesMonthAndPlan_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.HouseholdMember);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Partner updated",
                    700m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter!.Name.Should().Be("Partner updated");
        monthAfter.AmountMonthly.Should().Be(700m);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);
        baselineAfter!.Name.Should().Be("Partner updated");
        baselineAfter.AmountMonthly.Should().Be(700m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task PatchIncomeItem_BudgetPlanOnly_UpdatesPlanOnly_AndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var monthBefore = await GetMonthIncomeRowAsync(target.Id, target.Kind);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    "Plan only side job",
                    2400m,
                    true,
                    UpdateDefault: false,
                    Scope: BudgetMonthIncomeEditScopes.BudgetPlanOnly),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var monthAfter = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        monthAfter.Should().BeEquivalentTo(monthBefore);

        var baselineAfter = await GetBaselineIncomeRowAsync(target.SourceIncomeItemId!.Value, target.Kind);
        baselineAfter!.Name.Should().Be("Plan only side job");
        baselineAfter.AmountMonthly.Should().Be(2400m);

        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(1);
    }

    [Fact]
    public async Task BulkPatch_IsAllOrNothing_WhenAnyRowFails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        var before = await GetMonthIncomeRowAsync(target.Id, target.Kind);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthIncomeItemsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    new[]
                    {
                        new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                            target.Id,
                            "Should not persist",
                            3333m,
                            true,
                            false,
                            BudgetMonthIncomeEditScopes.CurrentMonthOnly),
                        new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                            Guid.NewGuid(),
                            "Missing",
                            1m,
                            true,
                            false,
                            BudgetMonthIncomeEditScopes.CurrentMonthOnly)
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        var after = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        after.Should().BeEquivalentTo(before);
    }

    [Fact]
    public async Task BulkPatch_WritesOneAuditEventPerChangedRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var targets = (await GetRowsAsync(sut, seed.Persoid))
            .Where(x => x.Kind is BudgetMonthIncomeItemKinds.SideHustle or BudgetMonthIncomeItemKinds.HouseholdMember)
            .ToArray();
        targets.Should().HaveCount(2);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthIncomeItemsBulkCommand(
                    seed.Persoid,
                    "2026-01",
                    targets.Select((x, index) => new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                        x.Id,
                        x.Name + " bulk",
                        x.AmountMonthly + 10m + index,
                        x.IsActive,
                        false,
                        BudgetMonthIncomeEditScopes.CurrentMonthOnly)).ToList()),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        (await CountChangeEventsAsync(budgetMonthId, "updated")).Should().Be(2);
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
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);
        await MarkMonthStatusAsync("2026-01", status);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    target.Id,
                    target.Name,
                    target.AmountMonthly + 1m,
                    target.IsActive,
                    false),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task MonthOnlyRows_RejectBudgetPlanScopes()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    BudgetMonthIncomeItemKinds.SideHustle,
                    "Month only",
                    100m,
                    true),
                CancellationToken.None));

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthIncomeItemCommand(
                    seed.Persoid,
                    "2026-01",
                    create.Value!.Id,
                    "Plan fail",
                    200m,
                    true,
                    false,
                    BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonthIncomeItemErrors.CannotUpdatePlanForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task DeleteIncomeItem_SoftDeletesChildRowAndWritesAudit()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));
        var budgetMonthId = await EnsureMonthAsync(sut, seed.Persoid);
        var target = (await GetRowsAsync(sut, seed.Persoid)).First(x => x.Kind == BudgetMonthIncomeItemKinds.SideHustle);

        var deleted = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthIncomeItemCommand(seed.Persoid, "2026-01", target.Id),
                CancellationToken.None));

        deleted.IsFailure.Should().BeFalse();
        var after = await GetMonthIncomeRowAsync(target.Id, target.Kind);
        after!.IsDeleted.Should().BeTrue();
        (await CountChangeEventsAsync(budgetMonthId, "deleted")).Should().Be(1);
    }

    private async Task<Guid> EnsureMonthAsync(Sut sut, Guid persoid)
    {
        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        return ensure.Value!.BudgetMonthId;
    }

    private async Task<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>> GetRowsAsync(Sut sut, Guid persoid)
    {
        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetHandler.Handle(
                new GetBudgetMonthIncomeItemsQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        return result.Value!;
    }

    private async Task<IncomeItemDbRow?> GetMonthIncomeRowAsync(Guid id, string kind)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var sql = kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => """
                SELECT Id, NULL AS Name, NetSalaryMonthly AS AmountMonthly, TRUE AS IsActive, IsDeleted
                FROM BudgetMonthIncome
                WHERE Id = @id
                LIMIT 1;
            """,
            BudgetMonthIncomeItemKinds.HouseholdMember => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, IsDeleted
                FROM BudgetMonthIncomeHouseholdMember
                WHERE Id = @id
                LIMIT 1;
            """,
            _ => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, IsDeleted
                FROM BudgetMonthIncomeSideHustle
                WHERE Id = @id
                LIMIT 1;
            """
        };

        return await conn.QuerySingleOrDefaultAsync<IncomeItemDbRow>(sql, new { id });
    }

    private async Task<IncomeItemDbRow?> GetBaselineIncomeRowAsync(Guid id, string kind)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var sql = kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => """
                SELECT Id, NULL AS Name, NetSalaryMonthly AS AmountMonthly, TRUE AS IsActive, FALSE AS IsDeleted
                FROM Income
                WHERE Id = @id
                LIMIT 1;
            """,
            BudgetMonthIncomeItemKinds.HouseholdMember => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, FALSE AS IsDeleted
                FROM IncomeHouseholdMember
                WHERE Id = @id
                LIMIT 1;
            """,
            _ => """
                SELECT Id, Name, IncomeMonthly AS AmountMonthly, IsActive, FALSE AS IsDeleted
                FROM IncomeSideHustle
                WHERE Id = @id
                LIMIT 1;
            """
        };

        return await conn.QuerySingleOrDefaultAsync<IncomeItemDbRow>(sql, new { id });
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
              AND EntityType = 'income-item'
              AND ChangeType = @changeType;
        """, new { budgetMonthId, changeType });
    }

    // Used by the create-with-plan tests to confirm the audit row points at
    // the freshly-created plan row via SourceEntityId — proving the link is
    // reviewable from history without joining plan tables.
    private async Task<int> CountChangeEventsWithSourceAsync(
        Guid budgetMonthId,
        string changeType,
        Guid sourceEntityId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>("""
            SELECT COUNT(*)
            FROM BudgetMonthChangeEvent
            WHERE BudgetMonthId = @budgetMonthId
              AND EntityType = 'income-item'
              AND ChangeType = @changeType
              AND SourceEntityId = @sourceEntityId;
        """, new { budgetMonthId, changeType, sourceEntityId });
    }

    // Counts rows in a plan-side income table by name. Used to assert
    // currentMonthOnly does NOT touch plan tables, and that the
    // currentMonthAndBudgetPlan create lands in the correct kind's table.
    private async Task<int> CountPlanRowsAsync(string table, string name)
    {
        if (table is not ("IncomeSideHustle" or "IncomeHouseholdMember"))
            throw new ArgumentException($"Unsupported plan table: {table}", nameof(table));

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        // Table name is constrained above; inlining it is safe and avoids
        // needing a switch over four near-identical SQL strings.
        return await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM {table} WHERE Name = @name;",
            new { name });
    }

    private sealed class IncomeItemDbRow
    {
        public Guid Id { get; init; }
        public string? Name { get; init; }
        public decimal AmountMonthly { get; init; }
        public bool IsActive { get; init; }
        public bool IsDeleted { get; init; }
    }

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthIncomeItemsQueryHandler GetHandler { get; init; }
        public required CreateBudgetMonthIncomeItemCommandHandler CreateHandler { get; init; }
        public required PatchBudgetMonthIncomeItemCommandHandler PatchHandler { get; init; }
        public required PatchBudgetMonthIncomeItemsBulkCommandHandler BulkPatchHandler { get; init; }
        public required DeleteBudgetMonthIncomeItemCommandHandler DeleteHandler { get; init; }
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

        var incomeRepo = new BudgetMonthIncomeItemMutationRepository(
            uow,
            NullLogger<BudgetMonthIncomeItemMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetHandler = new GetBudgetMonthIncomeItemsQueryHandler(lifecycle, incomeRepo),
            CreateHandler = new CreateBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            PatchHandler = new PatchBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            BulkPatchHandler = new PatchBudgetMonthIncomeItemsBulkCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System),
            DeleteHandler = new DeleteBudgetMonthIncomeItemCommandHandler(
                lifecycle,
                incomeRepo,
                changeEventRepo,
                TimeProvider.System)
        };
    }
}
