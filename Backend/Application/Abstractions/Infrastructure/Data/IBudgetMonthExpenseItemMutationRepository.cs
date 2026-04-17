using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Models;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthExpenseItemMutationRepository
{
    Task<BudgetMonthExpenseItemMutationReadModel?> GetExpenseItemForMutationAsync(
        Guid budgetMonthId,
        Guid monthExpenseItemId,
        CancellationToken ct);

    Task<bool> ExpenseCategoryExistsAsync(Guid categoryId, CancellationToken ct);

    Task UpdateMonthExpenseItemAsync(
        UpdateBudgetMonthExpenseItemModel model,
        CancellationToken ct);

    Task<Guid> InsertMonthExpenseItemAsync(
        InsertBudgetMonthExpenseItemModel model,
        CancellationToken ct);

    Task<bool> BaselineExpenseItemExistsAsync(Guid expenseItemId, CancellationToken ct);
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);
    Task UpdateBaselineExpenseItemAsync(
        UpdateExpenseItemModel model,
        CancellationToken ct);

    Task<bool> SoftDeleteMonthExpenseItemAsync(
        Guid budgetMonthId,
        Guid monthExpenseItemId,
        Guid actorPersoid,
        DateTime utcNow,
        CancellationToken ct);
}