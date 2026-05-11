using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;
using Backend.Application.Features.Budgets.Months.Editor.Queries;
using Backend.Application.BudgetMonths.Services;
using Backend.Application.Services.Budget.Materializer;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Errors.Budget;
using Backend.Infrastructure.Data.Sql.Helpers.UnitOfWork;
using Backend.Infrastructure.Repositories.Budget;
using Backend.Infrastructure.Repositories.Budget.Months;
using Backend.Infrastructure.Repositories.Budget.Months.Editor;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;
using Backend.Infrastructure.Repositories.Budget.Months.Editor.Expense;
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

namespace Backend.IntegrationTests.Budget.BudgetMonths.Editor;

[Collection("it:db")]
public sealed class BudgetMonthExpenseItemBulkEditorTests
{
    private readonly MariaDbFixture _db;

    public BudgetMonthExpenseItemBulkEditorTests(MariaDbFixture db) => _db = db;

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
    public async Task BulkPatch_AppliesAllRows_And_WritesOneEventPerRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var rows = editor.Value!.ExpenseItems
            .Where(x => !x.IsDeleted && !x.IsMonthOnly)
            .Take(2)
            .ToList();
        rows.Should().HaveCount(2, "the WithData seed should provide at least two baseline-backed rows for this test");

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: rows.Select(r => new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                        MonthExpenseItemId: r.Id,
                        Name: r.Name + " (bulk)",
                        CategoryId: r.CategoryId,
                        AmountMonthly: r.AmountMonthly + 1m,
                        IsActive: r.IsActive,
                        SubscriptionLifecycleStatus: null,
                        UpdateDefault: false)).ToList()),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        bulk.Value.Should().HaveCount(rows.Count);

        foreach (var (original, updated) in rows.Zip(bulk.Value!))
        {
            updated.Id.Should().Be(original.Id);
            updated.Name.Should().Be(original.Name + " (bulk)");
            updated.AmountMonthly.Should().Be(original.AmountMonthly + 1m);

            var dbRow = await GetMonthExpenseRowAsync(budgetMonthId, original.Id);
            dbRow.Should().NotBeNull();
            dbRow!.Name.Should().Be(original.Name + " (bulk)");
            dbRow.AmountMonthly.Should().Be(original.AmountMonthly + 1m);
        }

        var updateEventCount = await CountChangeEventsAsync(budgetMonthId, "updated");
        updateEventCount.Should().Be(rows.Count, "each row in the bulk request should produce one audit event");
    }

    [Fact]
    public async Task BulkPatch_UpdateDefaultMixed_OnlyUpdatesBaselineForMarkedRows()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var baselineBacked = editor.Value!.ExpenseItems
            .Where(x => !x.IsDeleted && !x.IsMonthOnly)
            .Take(2)
            .ToList();
        baselineBacked.Should().HaveCount(2);

        var rowOnlyMonth = baselineBacked[0];
        var rowAlsoBaseline = baselineBacked[1];

        var baselineBeforeOnlyMonth = await GetBaselineExpenseRowAsync(rowOnlyMonth.SourceExpenseItemId!.Value);
        var baselineBeforeAlsoBaseline = await GetBaselineExpenseRowAsync(rowAlsoBaseline.SourceExpenseItemId!.Value);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: rowOnlyMonth.Id,
                            Name: "month-only edit",
                            CategoryId: rowOnlyMonth.CategoryId,
                            AmountMonthly: rowOnlyMonth.AmountMonthly + 11m,
                            IsActive: rowOnlyMonth.IsActive,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: false),
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: rowAlsoBaseline.Id,
                            Name: "propagated edit",
                            CategoryId: rowAlsoBaseline.CategoryId,
                            AmountMonthly: rowAlsoBaseline.AmountMonthly + 22m,
                            IsActive: rowAlsoBaseline.IsActive,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: true),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();

        var baselineAfterOnlyMonth = await GetBaselineExpenseRowAsync(rowOnlyMonth.SourceExpenseItemId.Value);
        baselineAfterOnlyMonth!.Name.Should().Be(baselineBeforeOnlyMonth!.Name);
        baselineAfterOnlyMonth.AmountMonthly.Should().Be(baselineBeforeOnlyMonth.AmountMonthly);

        var baselineAfterAlsoBaseline = await GetBaselineExpenseRowAsync(rowAlsoBaseline.SourceExpenseItemId.Value);
        baselineAfterAlsoBaseline!.Name.Should().Be("propagated edit");
        baselineAfterAlsoBaseline.AmountMonthly.Should().Be(baselineBeforeAlsoBaseline!.AmountMonthly + 22m);
    }

    [Fact]
    public async Task BulkPatch_CurrentMonthAndBudgetPlanScope_UpdatesMonthRowAndBaseline()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));
        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted && !x.IsMonthOnly);
        var baselineBefore = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId!.Value);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: target.Id,
                            Name: "month and plan",
                            CategoryId: target.CategoryId,
                            AmountMonthly: target.AmountMonthly + 33m,
                            IsActive: target.IsActive,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: false,
                            Scope: BudgetMonthExpenseEditScopes.CurrentMonthAndBudgetPlan),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        bulk.Value![0].Name.Should().Be("month and plan");

        var monthAfter = await GetMonthExpenseRowAsync(budgetMonthId, target.Id);
        monthAfter!.Name.Should().Be("month and plan");
        monthAfter.AmountMonthly.Should().Be(target.AmountMonthly + 33m);

        var baselineAfter = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId.Value);
        baselineAfter!.Name.Should().Be("month and plan");
        baselineAfter.AmountMonthly.Should().Be(baselineBefore!.AmountMonthly + 33m);
    }

    [Fact]
    public async Task BulkPatch_BudgetPlanOnlyScope_UpdatesBaselineOnly_AndReturnsUnchangedMonthRow()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));
        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted && !x.IsMonthOnly);
        var baselineBefore = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId!.Value);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: target.Id,
                            Name: "plan only",
                            CategoryId: target.CategoryId,
                            AmountMonthly: target.AmountMonthly + 44m,
                            IsActive: target.IsActive,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: false,
                            Scope: BudgetMonthExpenseEditScopes.BudgetPlanOnly),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeFalse();
        bulk.Value![0].Name.Should().Be(target.Name);
        bulk.Value[0].AmountMonthly.Should().Be(target.AmountMonthly);

        var monthAfter = await GetMonthExpenseRowAsync(budgetMonthId, target.Id);
        monthAfter!.Name.Should().Be(target.Name);
        monthAfter.AmountMonthly.Should().Be(target.AmountMonthly);

        var baselineAfter = await GetBaselineExpenseRowAsync(target.SourceExpenseItemId.Value);
        baselineAfter!.Name.Should().Be("plan only");
        baselineAfter.AmountMonthly.Should().Be(baselineBefore!.AmountMonthly + 44m);

        var events = await GetChangeEventsAsync(budgetMonthId);
        events.Should().ContainSingle(x =>
            x.ChangeType == "updated" &&
            x.EntityId == target.Id &&
            x.ChangeSetJson!.Contains("\"scope\":\"budgetPlanOnly\""));
    }

    [Fact]
    public async Task BulkPatch_InvalidRow_RollsBackEntireRequest()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var validRow = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);
        var validRowOriginalAmount = validRow.AmountMonthly;
        var nonExistentId = Guid.NewGuid();
        var command = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: seed.Persoid,
            YearMonth: "2026-01",
            Items: new[]
            {
                new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                    MonthExpenseItemId: validRow.Id,
                    Name: "should be rolled back",
                    CategoryId: validRow.CategoryId,
                    AmountMonthly: validRowOriginalAmount + 9999m,
                    IsActive: validRow.IsActive,
                    SubscriptionLifecycleStatus: null,
                    UpdateDefault: false,
                    Scope: BudgetMonthExpenseEditScopes.CurrentMonthOnly),
                new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                    MonthExpenseItemId: nonExistentId,
                    Name: "ghost row",
                    CategoryId: validRow.CategoryId,
                    AmountMonthly: 1m,
                    IsActive: true,
                    SubscriptionLifecycleStatus: null,
                    UpdateDefault: false,
                    Scope: BudgetMonthExpenseEditScopes.BudgetPlanOnly),
            });
        var behavior = new UnitOfWorkPipelineBehavior<
            PatchBudgetMonthExpenseItemsBulkCommand,
            Backend.Domain.Shared.Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>>(
            sut.Uow,
            NullLogger<UnitOfWorkPipelineBehavior<
                PatchBudgetMonthExpenseItemsBulkCommand,
                Backend.Domain.Shared.Result<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>>>.Instance);

        // First row would succeed. Second row references a missing item — must roll back BOTH rows.
        var bulk = await behavior.Handle(
            command,
            () => sut.BulkPatchHandler.Handle(command, CancellationToken.None),
            CancellationToken.None);

        bulk.IsFailure.Should().BeTrue();
        bulk.Error!.Code.Should().Be(BudgetMonthExpenseItemErrors.NotFound.Code);

        // The valid row from the same request must be unchanged because the
        // surrounding UnitOfWork transaction was rolled back.
        var rowAfter = await GetMonthExpenseRowAsync(budgetMonthId, validRow.Id);
        rowAfter.Should().NotBeNull();
        rowAfter!.AmountMonthly.Should().Be(validRowOriginalAmount);
        rowAfter.Name.Should().Be(validRow.Name);

        var updateEventCount = await CountChangeEventsAsync(budgetMonthId, "updated");
        updateEventCount.Should().Be(0, "no audit events should remain after a rolled-back bulk request");
    }

    [Fact]
    public async Task BulkPatch_WhenMonthClosed_Fails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        var ensure = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var budgetMonthId = ensure.Value!.BudgetMonthId;

        var editor = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.GetEditorHandler.Handle(new GetBudgetMonthEditorQuery(seed.Persoid, "2026-01"), CancellationToken.None));

        var target = editor.Value!.ExpenseItems.First(x => !x.IsDeleted);

        await MarkMonthClosedAsync(budgetMonthId);

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: target.Id,
                            Name: "should not save",
                            CategoryId: target.CategoryId,
                            AmountMonthly: target.AmountMonthly + 50m,
                            IsActive: target.IsActive,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: false),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        bulk.Error!.Code.Should().Be(BudgetMonth.MonthIsClosed.Code);
    }

    [Fact]
    public async Task BulkPatch_UpdateDefaultTrue_ForMonthOnlyRow_Fails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem
                    .CreateBudgetMonthExpenseItemCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "month only",
                    AmountMonthly: 50m,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: create.Value!.Id,
                            Name: "should fail",
                            CategoryId: create.Value.CategoryId,
                            AmountMonthly: 80m,
                            IsActive: true,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: true),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        bulk.Error!.Code.Should().Be(BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow.Code);
    }

    [Fact]
    public async Task BulkPatch_BudgetPlanScope_ForMonthOnlyRow_Fails()
    {
        await _db.ResetAsync();
        var seed = await DbSeeds.SeedBudgetAsync(_db.ConnectionString, BudgetSeedScenario.WithData);
        var sut = CreateSut(new DateTime(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc));

        await sut.Uow.InTx(CancellationToken.None, () =>
            sut.Lifecycle.EnsureAccessibleMonthAsync(seed.Persoid, seed.Persoid, "2026-01", CancellationToken.None));

        var create = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.CreateHandler.Handle(
                new Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem
                    .CreateBudgetMonthExpenseItemCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    CategoryId: ExpenseCategories.Other,
                    Name: "month only",
                    AmountMonthly: 50m,
                    IsActive: true),
                CancellationToken.None));

        create.IsFailure.Should().BeFalse();

        var bulk = await sut.Uow.InTx(CancellationToken.None, () =>
            sut.BulkPatchHandler.Handle(
                new PatchBudgetMonthExpenseItemsBulkCommand(
                    Persoid: seed.Persoid,
                    YearMonth: "2026-01",
                    Items: new[]
                    {
                        new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                            MonthExpenseItemId: create.Value!.Id,
                            Name: "should fail",
                            CategoryId: create.Value.CategoryId,
                            AmountMonthly: 80m,
                            IsActive: true,
                            SubscriptionLifecycleStatus: null,
                            UpdateDefault: false,
                            Scope: BudgetMonthExpenseEditScopes.BudgetPlanOnly),
                    }),
                CancellationToken.None));

        bulk.IsFailure.Should().BeTrue();
        bulk.Error!.Code.Should().Be(BudgetMonthExpenseItemErrors.CannotUpdateDefaultForMonthOnlyRow.Code);
    }

    private async Task MarkMonthClosedAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync(@"
            UPDATE BudgetMonth
            SET Status = 'closed', ClosedAt = UTC_TIMESTAMP()
            WHERE Id = @budgetMonthId;",
            new { budgetMonthId });
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
                SubscriptionLifecycleStatus,
                IsActive,
                IsDeleted
            FROM BudgetMonthExpenseItem
            WHERE BudgetMonthId = @budgetMonthId
              AND Id = @id
            LIMIT 1;",
            new { budgetMonthId, id });
    }

    private async Task<ExpenseItemBaselineDbRow?> GetBaselineExpenseRowAsync(Guid id)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return await conn.QuerySingleOrDefaultAsync<ExpenseItemBaselineDbRow>(@"
            SELECT Id, CategoryId, Name, AmountMonthly, IsActive
            FROM ExpenseItem
            WHERE Id = @id
            LIMIT 1;",
            new { id });
    }

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

    private async Task<IReadOnlyList<BudgetMonthChangeEventDbRow>> GetChangeEventsAsync(Guid budgetMonthId)
    {
        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        return (await conn.QueryAsync<BudgetMonthChangeEventDbRow>(@"
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

    private sealed record ExpenseItemMonthDbRow(
        Guid Id,
        Guid BudgetMonthId,
        Guid? SourceExpenseItemId,
        Guid CategoryId,
        string Name,
        decimal AmountMonthly,
        string? SubscriptionLifecycleStatus,
        bool IsActive,
        bool IsDeleted);

    private sealed record ExpenseItemBaselineDbRow(
        Guid Id,
        Guid CategoryId,
        string Name,
        decimal AmountMonthly,
        bool IsActive);

    private sealed class Sut
    {
        public required UnitOfWork Uow { get; init; }
        public required IBudgetMonthLifecycleService Lifecycle { get; init; }
        public required GetBudgetMonthEditorQueryHandler GetEditorHandler { get; init; }
        public required Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem
            .CreateBudgetMonthExpenseItemCommandHandler CreateHandler { get; init; }
        public required PatchBudgetMonthExpenseItemsBulkCommandHandler BulkPatchHandler { get; init; }
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

        var editorRepo = new BudgetMonthEditorRepository(
            uow, NullLogger<BudgetMonthEditorRepository>.Instance, dbOpts);

        var mutationRepo = new BudgetMonthExpenseItemMutationRepository(
            uow, NullLogger<BudgetMonthExpenseItemMutationRepository>.Instance, dbOpts);

        var changeEventRepo = new BudgetMonthChangeEventRepository(
            uow, NullLogger<BudgetMonthChangeEventRepository>.Instance, dbOpts);

        var getEditorHandler = new GetBudgetMonthEditorQueryHandler(lifecycle, editorRepo);
        var createHandler = new Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem
            .CreateBudgetMonthExpenseItemCommandHandler(
                lifecycle, mutationRepo, changeEventRepo, TimeProvider.System);

        var bulkPatchHandler = new PatchBudgetMonthExpenseItemsBulkCommandHandler(
            lifecycle, mutationRepo, changeEventRepo, TimeProvider.System);

        return new Sut
        {
            Uow = uow,
            Lifecycle = lifecycle,
            GetEditorHandler = getEditorHandler,
            CreateHandler = createHandler,
            BulkPatchHandler = bulkPatchHandler,
        };
    }
}
