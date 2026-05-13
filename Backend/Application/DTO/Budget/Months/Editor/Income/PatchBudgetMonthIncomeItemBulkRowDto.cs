namespace Backend.Application.DTO.Budget.Months.Editor.Income;

public sealed record PatchBudgetMonthIncomeItemBulkRowDto(
    Guid MonthIncomeItemId,
    string? Name,
    decimal? AmountMonthly,
    bool? IsActive,
    bool UpdateDefault,
    string? Scope = null);

