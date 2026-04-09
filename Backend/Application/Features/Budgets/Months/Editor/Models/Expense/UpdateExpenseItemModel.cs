namespace Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

public sealed record UpdateExpenseItemModel(
    Guid ExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    Guid ActorPersoid,
    DateTime UtcNow);