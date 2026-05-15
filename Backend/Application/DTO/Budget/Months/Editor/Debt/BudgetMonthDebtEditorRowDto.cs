namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

public sealed record BudgetMonthDebtEditorRowDto(
    Guid Id,
    Guid? SourceDebtId,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string Status,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault);
