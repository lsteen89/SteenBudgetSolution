namespace Backend.Application.DTO.Budget.Months.Editor;

public sealed record BudgetMonthEditorMetaDto(
    Guid BudgetMonthId,
    string YearMonth,
    string Status,
    bool IsEditable,
    decimal? CarryOverAmount,
    string CarryOverMode);