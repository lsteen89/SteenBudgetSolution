namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

public sealed record PatchBudgetMonthDebtRequestDto(
    decimal MonthlyPayment,
    string? Scope = null);
