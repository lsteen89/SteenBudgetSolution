using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Backend.Domain.Errors.Budget;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Features.Budgets.Months.Editor.Expense.DeleteExpenseItem;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Expense;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Application.Features.Budgets.Dashboard.GetBudgetDashboardMonth;
using Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Queries;
using Backend.Application.Services.Budget.Compute;
using Backend.Application.Services.Budget.Materializer;
using Backend.Application.Services.Debts;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget;
using Backend.Infrastructure.Repositories.Budget.BudgetDashboard;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor;
using Backend.Infrastructure.Repositories.Budget.Months.Materializer;
using Backend.Infrastructure.Repositories.Budget.Months.Seed;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.Shared.Seeds;
using Backend.IntegrationTests.Shared.Seeds.Budget;
using Backend.Infrastructure.Repositories.User;
using Backend.Settings;
using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

[Collection("it:db")]
public sealed class BudgetMonthExpenseItemEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthExpenseItemEditorTests(MariaDbFixture db) => _db = db;

    private static IOptions<DatabaseSettings> DbOptions(string cs) =>
        Options.Create(new DatabaseSettings
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
    public async Task GetEditor_ReturnsMonthBackedExpenseRows()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        ensure.Value.Should().NotBeNull();

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();

        result.Value!.Month.BudgetMonthId.Should().Be(budgetMonthId);
        result.Value.Month.YearMonth.Should().Be("2026-01");
        result.Value.ExpenseItems.Should().NotBeEmpty();
        result.Value.ExpenseItems.Should().OnlyContain(x => x.Id != Guid.Empty);
    }
    [Fact]
    public async Task PatchExpenseItem_UpdateDefaultFalse_UpdatesMonthRowOnly()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted && !x.IsMonthOnly);

        var baselineBefore = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId!.Value);
        baselineBefore.Should().NotBeNull();

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: target.Id,
                    Name: "Updated month name",
                    CategoryId: ExpenseCategories.Other,
                    AmountMonthly: 777m,
                    IsActive: false,
                    UpdateDefault: false),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();
        patch.Value.Should().NotBeNull();

        var monthAfter = await GetMonthExpenseRowAsync(budgetMonthId, target.Id);
        monthAfter.Should().NotBeNull();
        monthAfter!.Name.Should().Be("Updated month name");
        monthAfter.CategoryId.Should().Be(ExpenseCategories.Other);
        monthAfter.AmountMonthly.Should().Be(777m);
        monthAfter.IsActive.Should().BeFalse();

        var baselineAfter = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId.Value);
        baselineAfter.Should().NotBeNull();
        baselineAfter!.Name.Should().Be(baselineBefore!.Name);
        baselineAfter.CategoryId.Should().Be(baselineBefore.CategoryId);
        baselineAfter.AmountMonthly.Should().Be(baselineBefore.AmountMonthly);
        baselineAfter.IsActive.Should().Be(baselineBefore.IsActive);

        var eventCount = await CountChangeEventsAsync(budgetMonthId, "updated");
        eventCount.Should().Be(1);
    }
    [Fact]
    public async Task PatchExpenseItem_UpdateDefaultTrue_UpdatesMonthAndBaseline()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted && !x.IsMonthOnly);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: target.Id,
                    Name: "Propagated expense",
                    CategoryId: ExpenseCategories.Subscription,
                    AmountMonthly: 999m,
                    IsActive: true,
                    UpdateDefault: true),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var baselineAfter = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId!.Value);
        baselineAfter.Should().NotBeNull();
        baselineAfter!.Name.Should().Be("Propagated expense");
        baselineAfter.CategoryId.Should().Be(ExpenseCategories.Subscription);
        baselineAfter.AmountMonthly.Should().Be(999m);
        baselineAfter.IsActive.Should().BeTrue();
    }
    [Fact]
    public async Task CreateExpenseItem_CreatesMonthOnlyRow()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Month only expense",
                    AmountMonthly: 123m,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value.Should().NotBeNull();
        create.Value!.IsMonthOnly.Should().BeTrue();
        create.Value.CanUpdateDefault.Should().BeFalse();
        create.Value.SourceExpenseItemId.Should().BeNull();

        var row = await GetMonthExpenseRowAsync(budgetMonthId, create.Value.Id);
        row.Should().NotBeNull();
        row!.SourceExpenseItemId.Should().BeNull();
        row.Name.Should().Be("Month only expense");
        row.AmountMonthly.Should().Be(123m);
        row.IsDeleted.Should().BeFalse();

        var eventCount = await CountChangeEventsAsync(budgetMonthId, "created");
        eventCount.Should().Be(1);
    }
    [Fact]
    public async Task DeleteExpenseItem_SoftDeletesMonthRow()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);

        var delete = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: target.Id),
                CancellationToken.None));

        delete.IsFailure.Should().BeFalse();

        var row = await GetMonthExpenseRowAsync(budgetMonthId, target.Id);
        row.Should().NotBeNull();
        row!.IsDeleted.Should().BeTrue();

        var eventCount = await CountChangeEventsAsync(budgetMonthId, "deleted");
        eventCount.Should().Be(1);
    }
    [Fact]
    public async Task PatchExpenseItem_UpdateDefaultTrue_ForMonthOnlyRow_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Temporary row",
                    AmountMonthly: 50m,
                    IsActive: true),
                CancellationToken.None));

        var row = create.Value!;

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: row.Id,
                    Name: "Should fail",
                    CategoryId: null,
                    AmountMonthly: 80m,
                    IsActive: true,
                    UpdateDefault: true),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error.Should().NotBeNull();
        patch.Error!.Code.Should().Be(BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow.Code);
    }
    [Fact]
    public async Task Dashboard_ReflectsCreatedMonthOnlyExpense()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var before = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None));

        before.IsFailure.Should().BeFalse();
        before.Value.Should().NotBeNull();

        var beforeExpenses = before.Value!.LiveDashboard!.Expenditure.TotalExpensesMonthly;

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Extra cost",
                    AmountMonthly: 200m,
                    IsActive: true),
                CancellationToken.None));

        var after = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(new GetBudgetDashboardMonthQuery(persoid, "2026-01"), CancellationToken.None));

        after.IsFailure.Should().BeFalse();
        after.Value.Should().NotBeNull();
        after.Value!.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(beforeExpenses + 200m);
    }
    [Fact]
    public async Task Dashboard_ReflectsPatchCreateDelete()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var before = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(
                new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
                CancellationToken.None));

        before.IsFailure.Should().BeFalse();
        before.Value.Should().NotBeNull();
        before.Value!.LiveDashboard.Should().NotBeNull();

        var initialExpenses = before.Value.LiveDashboard!.Expenditure.TotalExpensesMonthly;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        editor.IsFailure.Should().BeFalse();
        editor.Value.Should().NotBeNull();

        var patchTarget = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);
        var patchIncrease = 250m;
        var patchedAmount = patchTarget.AmountMonthly + patchIncrease;

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: patchTarget.Id,
                    Name: patchTarget.Name,
                    CategoryId: patchTarget.CategoryId,
                    AmountMonthly: patchedAmount,
                    IsActive: patchTarget.IsActive,
                    UpdateDefault: false),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var afterPatch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(
                new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
                CancellationToken.None));

        afterPatch.IsFailure.Should().BeFalse();
        afterPatch.Value.Should().NotBeNull();
        afterPatch.Value!.LiveDashboard.Should().NotBeNull();
        afterPatch.Value.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(initialExpenses + patchIncrease);

        const decimal createdAmount = 175m;

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Dashboard scenario create",
                    AmountMonthly: createdAmount,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value.Should().NotBeNull();

        var afterCreate = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(
                new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
                CancellationToken.None));

        afterCreate.IsFailure.Should().BeFalse();
        afterCreate.Value.Should().NotBeNull();
        afterCreate.Value!.LiveDashboard.Should().NotBeNull();
        afterCreate.Value.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(initialExpenses + patchIncrease + createdAmount);

        var delete = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: create.Value!.Id),
                CancellationToken.None));

        delete.IsFailure.Should().BeFalse();

        var afterDelete = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DashboardHandler.Handle(
                new GetBudgetDashboardMonthQuery(persoid, "2026-01"),
                CancellationToken.None));

        afterDelete.IsFailure.Should().BeFalse();
        afterDelete.Value.Should().NotBeNull();
        afterDelete.Value!.LiveDashboard.Should().NotBeNull();
        afterDelete.Value.LiveDashboard!.Expenditure.TotalExpensesMonthly.Should().Be(initialExpenses + patchIncrease);
    }
    [Fact]
    public async Task Mutations_WriteChangeEvents()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        ensure.Value.Should().NotBeNull();

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        editor.IsFailure.Should().BeFalse();
        editor.Value.Should().NotBeNull();

        var patchTarget = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: patchTarget.Id,
                    Name: "Event patch",
                    CategoryId: null,
                    AmountMonthly: patchTarget.AmountMonthly + 10m,
                    IsActive: patchTarget.IsActive,
                    UpdateDefault: false),
                CancellationToken.None));

        patch.IsFailure.Should().BeFalse();

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Event create",
                    AmountMonthly: 123m,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();
        create.Value.Should().NotBeNull();

        var delete = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: create.Value!.Id),
                CancellationToken.None));

        delete.IsFailure.Should().BeFalse();

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var rows = (await conn.QueryAsync<BudgetMonthChangeEventDbRow>(@"
        SELECT
            Id,
            BudgetMonthId,
            EntityType,
            EntityId,
            SourceEntityId,
            ChangeType,
            ChangeSetJson,
            ChangedByUserId,
            ChangedAt
        FROM BudgetMonthChangeEvent
        WHERE BudgetMonthId = @budgetMonthId
        ORDER BY ChangedAt, Id;",
            new { budgetMonthId })).ToList();

        rows.Should().HaveCount(3);
        rows.Should().ContainSingle(x => x.ChangeType == "updated" && x.EntityType == "expense-item");
        rows.Should().ContainSingle(x => x.ChangeType == "created" && x.EntityType == "expense-item");
        rows.Should().ContainSingle(x => x.ChangeType == "deleted" && x.EntityType == "expense-item");
        rows.Should().OnlyContain(x => x.ChangedByUserId == persoid);
        rows.Should().OnlyContain(x => !string.IsNullOrWhiteSpace(x.ChangeSetJson));

        rows.Should().Contain(x => x.ChangeType == "updated" && x.ChangeSetJson!.Contains("before"));
        rows.Should().Contain(x => x.ChangeType == "updated" && x.ChangeSetJson!.Contains("after"));
        rows.Should().Contain(x => x.ChangeType == "created" && x.ChangeSetJson!.Contains("createdEntity"));
        rows.Should().Contain(x => x.ChangeType == "deleted" && x.ChangeSetJson!.Contains("deletedEntity"));
        rows.Should().Contain(x => x.ChangeType == "deleted" && x.ChangeSetJson!.Contains("isDeleted"));
    }
    [Fact]
    public async Task PatchExpenseItem_WhenMonthClosed_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;

        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(persoid, persoid, "2026-01", CancellationToken.None));

        ensure.IsFailure.Should().BeFalse();
        ensure.Value.Should().NotBeNull();

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);

        await MarkMonthClosedAsync(budgetMonthId);

        var patch = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.PatchHandler.Handle(
                new PatchBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: target.Id,
                    Name: "Should not patch",
                    CategoryId: ExpenseCategories.Other,
                    AmountMonthly: 999m,
                    IsActive: false,
                    UpdateDefault: false),
                CancellationToken.None));

        patch.IsFailure.Should().BeTrue();
        patch.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }
    [Fact]
    public async Task CreateExpenseItem_WhenMonthClosed_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-01",
            status: "closed",
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: "none",
            carryOverAmount: null);

        var sut = CreateSut(new DateTime(2026, 02, 01, 08, 00, 00, DateTimeKind.Utc));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new CreateBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "Should not create",
                    AmountMonthly: 100m,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeTrue();
        create.Error.Should().NotBeNull();
        create.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }
    [Fact]
    public async Task DeleteExpenseItem_WhenMonthClosed_Fails()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-01",
            status: "closed",
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: "none",
            carryOverAmount: null);

        var sut = CreateSut(new DateTime(2026, 02, 01, 08, 00, 00, DateTimeKind.Utc));

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        editor.IsFailure.Should().BeFalse();
        editor.Value.Should().NotBeNull();

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);

        var delete = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.DeleteHandler.Handle(
                new DeleteBudgetMonthExpenseItemCommand(
                    Persoid: persoid,
                    YearMonth: "2026-01",
                    MonthExpenseItemId: target.Id),
                CancellationToken.None));

        delete.IsFailure.Should().BeTrue();
        delete.Error.Should().NotBeNull();
        delete.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }
    [Fact]
    public async Task GetEditor_WhenMonthClosed_ReturnsIsEditableFalse()
    {
        await _db.ResetAsync();

        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var persoid = seed.Persoid;
        var userId = seed.UserId;
        var budgetId = seed.BudgetId;

        await BudgetMonthDsl.InsertAsync(
            cs: _db.ConnectionString,
            budgetId: budgetId,
            yearMonth: "2026-01",
            status: "closed",
            openedAtUtc: new DateTime(2026, 01, 01, 08, 00, 00, DateTimeKind.Utc),
            createdByUserId: userId,
            closedAtUtc: new DateTime(2026, 01, 31, 20, 00, 00, DateTimeKind.Utc),
            carryOverMode: "none",
            carryOverAmount: null);

        var sut = CreateSut(new DateTime(2026, 02, 01, 08, 00, 00, DateTimeKind.Utc));

        var result = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(
                new GetBudgetMonthEditorQuery(persoid, "2026-01"),
                CancellationToken.None));

        result.IsFailure.Should().BeFalse();
        result.Value.Should().NotBeNull();
        result.Value!.Month.YearMonth.Should().Be("2026-01");
        result.Value.Month.Status.Should().Be("closed");
        result.Value.Month.IsEditable.Should().BeFalse();
        result.Value.ExpenseItems.Should().NotBeNull();
    }
    private async Task MarkMonthClosedAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
        UPDATE BudgetMonth
        SET
            Status = 'closed',
            ClosedAt = UTC_TIMESTAMP()
        WHERE Id = @budgetMonthId;",
            new { budgetMonthId });
    }
    private sealed record BudgetMonthChangeEventDbRow(
        Guid Id,
        Guid BudgetMonthId,
        string EntityType,
        Guid EntityId,
        Guid? SourceEntityId,
        string ChangeType,
        string? ChangeSetJson,
        Guid ChangedByUserId,
        DateTime ChangedAt);
    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required ITimeProvider Time { get; init; }

        public required BudgetMonthRepository MonthsRepo { get; init; }
        public required BudgetMonthDashboardRepository MonthDashRepo { get; init; }
        public required BudgetDashboardRepository DashboardRepo { get; init; }

        public required BudgetMonthSeedSourceRepository SeedSourceRepo { get; init; }
        public required BudgetMonthMaterializationRepository MaterializationRepo { get; init; }

        public required BudgetMonthEditorRepository EditorRepo { get; init; }
        public required BudgetMonthExpenseItemMutationRepository MutationRepo { get; init; }
        public required BudgetMonthChangeEventRepository ChangeEventRepo { get; init; }

        public required IBudgetMonthLifecycleService Lifecycle { get; init; }

        public required GetBudgetMonthEditorQueryHandler GetEditorHandler { get; init; }
        public required PatchBudgetMonthExpenseItemCommandHandler PatchHandler { get; init; }
        public required CreateBudgetMonthExpenseItemCommandHandler CreateHandler { get; init; }
        public required DeleteBudgetMonthExpenseItemCommandHandler DeleteHandler { get; init; }

        public required GetBudgetDashboardMonthQueryHandler DashboardHandler { get; init; }
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

        var monthDashRepo = new BudgetMonthDashboardRepository(
            uow,
            NullLogger<BudgetMonthDashboardRepository>.Instance,
            dbOpts,
            time);

        var dashboardRepo = new BudgetDashboardRepository(
            uow,
            NullLogger<BudgetDashboardRepository>.Instance,
            dbOpts,
            time);

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

        IDebtPaymentCalculator debtCalc = new DebtPaymentCalculator();
        IBudgetMonthlyTotalsService totalsSvc = new BudgetMonthlyTotalsService(monthDashRepo, debtCalc);

        var lifecycle = new BudgetMonthLifecycleService(
            monthsRepo,
            materializer,
            time);

        var editorRepo = new BudgetMonthEditorRepository(
            uow,
            NullLogger<BudgetMonthEditorRepository>.Instance,
            dbOpts);

        var mutationRepo = new BudgetMonthExpenseItemMutationRepository(
            uow,
            NullLogger<BudgetMonthExpenseItemMutationRepository>.Instance,
            dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow,
            NullLogger<BudgetMonthChangeEventRepository>.Instance,
            dbOpts);

        var getEditorHandler = new GetBudgetMonthEditorQueryHandler(
            lifecycle,
            editorRepo);

        var patchHandler = new PatchBudgetMonthExpenseItemCommandHandler(
            lifecycle,
            mutationRepo,
            changeEventRepo,
            TimeProvider.System); // replace if your handler needs System.TimeProvider

        var createHandler = new CreateBudgetMonthExpenseItemCommandHandler(
            lifecycle,
            mutationRepo,
            changeEventRepo,
            TimeProvider.System);

        var deleteHandler = new DeleteBudgetMonthExpenseItemCommandHandler(
            lifecycle,
            mutationRepo,
            changeEventRepo,
            TimeProvider.System);

        var projector = new BudgetDashboardProjector(debtCalc);

        var users = new UserRepository(
            uow,
            NullLogger<UserRepository>.Instance,
            dbOpts);

        var dashboardHandler = new GetBudgetDashboardMonthQueryHandler(
            lifecycle,
            monthsRepo,
            monthDashRepo,
            users,
            projector);

        return new Sut
        {
            Uow = uow,
            Time = time,
            MonthsRepo = monthsRepo,
            MonthDashRepo = monthDashRepo,
            DashboardRepo = dashboardRepo,
            SeedSourceRepo = seedSourceRepo,
            MaterializationRepo = materializationRepo,
            EditorRepo = editorRepo,
            MutationRepo = mutationRepo,
            ChangeEventRepo = changeEventRepo,
            Lifecycle = lifecycle,
            GetEditorHandler = getEditorHandler,
            PatchHandler = patchHandler,
            CreateHandler = createHandler,
            DeleteHandler = deleteHandler,
            DashboardHandler = dashboardHandler
        };
    }
    private async Task<ExpenseItemMonthDbRow?> GetMonthExpenseRowAsync(Guid budgetMonthId, Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<ExpenseItemMonthDbRow>(@"
        SELECT
            Id,
            BudgetMonthId,
            SourceExpenseItemId,
            CategoryId,
            Name,
            AmountMonthly,
            IsActive,
            IsDeleted
        FROM BudgetMonthExpenseItem
        WHERE BudgetMonthId = @budgetMonthId
          AND Id = @id
        LIMIT 1;",
            new { budgetMonthId, id });
    }

    private sealed record ExpenseItemMonthDbRow(
        Guid Id,
        Guid BudgetMonthId,
        Guid? SourceExpenseItemId,
        Guid CategoryId,
        string Name,
        decimal AmountMonthly,
        bool IsActive,
        bool IsDeleted);
    private async Task<ExpenseItemBaselineDbRow?> GetBaselineExpenseRowAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<ExpenseItemBaselineDbRow>(@"
        SELECT
            Id,
            CategoryId,
            Name,
            AmountMonthly,
            IsActive
        FROM ExpenseItem
        WHERE Id = @id
        LIMIT 1;",
            new { id });
    }

    private sealed record ExpenseItemBaselineDbRow(
        Guid Id,
        Guid CategoryId,
        string Name,
        decimal AmountMonthly,
        bool IsActive);
    private async Task<int> CountChangeEventsAsync(Guid budgetMonthId, string changeType)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.ExecuteScalarAsync<int>(@"
        SELECT COUNT(*)
        FROM BudgetMonthChangeEvent
        WHERE BudgetMonthId = @budgetMonthId
          AND ChangeType = @changeType;",
            new { budgetMonthId, changeType });
    }
}