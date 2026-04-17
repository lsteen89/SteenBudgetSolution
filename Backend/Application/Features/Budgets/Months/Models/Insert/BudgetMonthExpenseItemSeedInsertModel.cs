namespace Backend.Application.Features.Budgets.Months.Models.Insert;

public sealed record BudgetMonthExpenseItemSeedInsertModel(
    Guid Id,
    Guid SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    int SortOrder);