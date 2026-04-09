namespace Backend.Application.DTO.Budget.Months.Editor;

public sealed record PatchBudgetMonthExpenseItemRequestDto(
    string? Name,
    Guid? CategoryId,
    decimal? AmountMonthly,
    bool? IsActive,
    bool UpdateDefault);