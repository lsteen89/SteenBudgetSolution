using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Income;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Income;

public sealed partial class BudgetMonthIncomeItemMutationRepository
    : SqlBase, IBudgetMonthIncomeItemMutationRepository
{
    public BudgetMonthIncomeItemMutationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthIncomeItemMutationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthMutationMetaReadModel>(
            GetBudgetMonthMeta,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthIncomeItemEditorRowReadModel>> GetIncomeItemEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthIncomeItemEditorRowReadModel>(
            GetIncomeItemEditorRows,
            new
            {
                BudgetMonthId = budgetMonthId,
                IncludeDeleted = includeDeleted
            },
            ct);

    public Task<BudgetMonthIncomeItemMutationReadModel?> GetIncomeItemForMutationAsync(
        Guid budgetMonthId,
        Guid monthIncomeItemId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthIncomeItemMutationReadModel>(
            GetIncomeItemForMutation,
            new
            {
                BudgetMonthId = budgetMonthId,
                MonthIncomeItemId = monthIncomeItemId
            },
            ct);

    public Task<Guid?> GetBudgetMonthIncomeIdAsync(Guid budgetMonthId, CancellationToken ct)
        => QuerySingleOrDefaultAsync<Guid?>(
            GetBudgetMonthIncomeId,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task<BudgetMonthIncomeForCreateReadModel?> GetBudgetMonthIncomeForCreateAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthIncomeForCreateReadModel>(
            GetBudgetMonthIncomeForCreate,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<Guid> InsertMonthIncomeItemAsync(
        InsertBudgetMonthIncomeItemModel model,
        CancellationToken ct)
    {
        var sql = model.Kind == BudgetMonthIncomeItemKinds.HouseholdMember
            ? InsertMonthHouseholdMemberIncomeItem
            : InsertMonthSideHustleIncomeItem;

        await ExecuteAsync(sql, model, ct);
        return model.Id;
    }

    public Task InsertBaselineIncomeItemAsync(
        InsertBaselineIncomeItemModel model,
        CancellationToken ct)
    {
        // Salary's plan row is the parent `Income` itself — there is no
        // child plan row to create — so the create flow rejects salary
        // upstream and this method is only ever called for side/household.
        var sql = model.Kind == BudgetMonthIncomeItemKinds.HouseholdMember
            ? InsertBaselineHouseholdMemberIncomeItem
            : InsertBaselineSideHustleIncomeItem;

        return ExecuteAsync(sql, model, ct);
    }

    public Task UpdateMonthIncomeItemAsync(
        UpdateBudgetMonthIncomeItemModel model,
        CancellationToken ct)
    {
        var sql = model.Kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => UpdateMonthSalaryIncomeItem,
            BudgetMonthIncomeItemKinds.HouseholdMember => UpdateMonthHouseholdMemberIncomeItem,
            _ => UpdateMonthSideHustleIncomeItem
        };

        return ExecuteAsync(sql, model, ct);
    }

    public async Task<bool> BaselineIncomeItemExistsAsync(
        string kind,
        Guid incomeItemId,
        CancellationToken ct)
    {
        var sql = kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => BaselineSalaryIncomeItemExists,
            BudgetMonthIncomeItemKinds.HouseholdMember => BaselineHouseholdMemberIncomeItemExists,
            _ => BaselineSideHustleIncomeItemExists
        };

        return await QuerySingleOrDefaultAsync<int?>(
            sql,
            new { IncomeItemId = incomeItemId },
            ct) == 1;
    }

    public Task UpdateBaselineIncomeItemAsync(
        UpdateBaselineIncomeItemModel model,
        CancellationToken ct)
    {
        var sql = model.Kind switch
        {
            BudgetMonthIncomeItemKinds.Salary => UpdateBaselineSalaryIncomeItem,
            BudgetMonthIncomeItemKinds.HouseholdMember => UpdateBaselineHouseholdMemberIncomeItem,
            _ => UpdateBaselineSideHustleIncomeItem
        };

        return ExecuteAsync(sql, model, ct);
    }

    public async Task<bool> SoftDeleteMonthIncomeItemAsync(
        Guid budgetMonthIncomeId,
        Guid monthIncomeItemId,
        string kind,
        Guid actorPersoid,
        DateTime utcNow,
        CancellationToken ct)
    {
        var sql = kind == BudgetMonthIncomeItemKinds.HouseholdMember
            ? SoftDeleteMonthHouseholdMemberIncomeItem
            : SoftDeleteMonthSideHustleIncomeItem;

        var affected = await ExecuteScalarAsync<int>(
            sql,
            new
            {
                BudgetMonthIncomeId = budgetMonthIncomeId,
                MonthIncomeItemId = monthIncomeItemId,
                ActorPersoid = actorPersoid,
                UtcNow = utcNow
            },
            ct);

        return affected > 0;
    }
}
