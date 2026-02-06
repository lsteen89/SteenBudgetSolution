namespace Backend.Domain.Entities.Budget.Expenses;

public readonly record struct ExpenseItemDraft(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly
);