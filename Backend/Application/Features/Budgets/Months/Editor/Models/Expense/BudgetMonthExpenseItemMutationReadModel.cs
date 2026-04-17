namespace Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

public sealed record BudgetMonthExpenseItemMutationReadModel(
    Guid Id,
    Guid BudgetMonthId,
    Guid? SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    bool IsDeleted);