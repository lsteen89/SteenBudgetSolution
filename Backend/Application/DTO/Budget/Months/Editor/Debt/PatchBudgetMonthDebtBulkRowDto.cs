namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

public sealed record PatchBudgetMonthDebtBulkRowDto(
    Guid MonthDebtId,
    decimal MonthlyPayment,
    string? Scope = null);
