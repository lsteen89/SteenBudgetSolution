namespace Backend.Application.DTO.Budget.Months.Editor.Income;

public sealed record BudgetMonthIncomeItemEditorRowDto(
    Guid Id,
    Guid? SourceIncomeItemId,
    string Kind,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault,
    string? SourceName = null,
    decimal? SourceAmountMonthly = null,
    bool? SourceIsActive = null);

