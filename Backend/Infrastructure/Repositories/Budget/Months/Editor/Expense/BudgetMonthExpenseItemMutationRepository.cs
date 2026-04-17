using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Backend.Infrastructure.Data.BaseClass;
using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Application.Features.Budgets.Months.Editor.Models;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Expense;

public sealed partial class BudgetMonthExpenseItemMutationRepository : SqlBase, IBudgetMonthExpenseItemMutationRepository
{
    public BudgetMonthExpenseItemMutationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthExpenseItemMutationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthExpenseItemMutationReadModel?> GetExpenseItemForMutationAsync(
        Guid budgetMonthId,
        Guid monthExpenseItemId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthExpenseItemMutationReadModel>(
            GetExpenseItemForMutation,
            new
            {
                BudgetMonthId = budgetMonthId,
                MonthExpenseItemId = monthExpenseItemId
            },
            ct);

    public async Task<bool> ExpenseCategoryExistsAsync(Guid categoryId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<int?>(
            ExpenseCategoryExists,
            new { CategoryId = categoryId },
            ct) == 1;

    public Task UpdateMonthExpenseItemAsync(
        UpdateBudgetMonthExpenseItemModel model,
        CancellationToken ct)
        => ExecuteAsync(
            UpdateMonthExpenseItem,
            model,
            ct);

    public async Task<Guid> InsertMonthExpenseItemAsync(
        InsertBudgetMonthExpenseItemModel model,
        CancellationToken ct)
    {
        await ExecuteAsync(InsertMonthExpenseItem, model, ct);
        return model.Id;
    }

    public async Task<bool> BaselineExpenseItemExistsAsync(Guid expenseItemId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<int?>(
            BaselineExpenseItemExists,
            new { ExpenseItemId = expenseItemId },
            ct) == 1;

    public Task UpdateBaselineExpenseItemAsync(
        UpdateExpenseItemModel model,
        CancellationToken ct)
        => ExecuteAsync(
            UpdateBaselineExpenseItem,
            model,
            ct);

    public async Task<bool> SoftDeleteMonthExpenseItemAsync(
        Guid budgetMonthId,
        Guid monthExpenseItemId,
        Guid actorPersoid,
        DateTime utcNow,
        CancellationToken ct)
    {
        var affected = await ExecuteScalarAsync<int>(
            SoftDeleteMonthExpenseItem,
            new
            {
                BudgetMonthId = budgetMonthId,
                MonthExpenseItemId = monthExpenseItemId,
                ActorPersoid = actorPersoid,
                UtcNow = utcNow
            },
            ct);

        return affected > 0;
    }
    public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
    => QuerySingleOrDefaultAsync<BudgetMonthMutationMetaReadModel>(
        GetBudgetMonthMeta,
        new { BudgetMonthId = budgetMonthId },
        ct);
}

