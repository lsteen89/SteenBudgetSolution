namespace Backend.Application.DTO.Budget.Months.Editor;

public sealed record CreateBudgetMonthExpenseItemRequestDto(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive);