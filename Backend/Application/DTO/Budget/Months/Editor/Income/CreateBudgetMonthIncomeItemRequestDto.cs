namespace Backend.Application.DTO.Budget.Months.Editor.Income;

public sealed record CreateBudgetMonthIncomeItemRequestDto(
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive);

