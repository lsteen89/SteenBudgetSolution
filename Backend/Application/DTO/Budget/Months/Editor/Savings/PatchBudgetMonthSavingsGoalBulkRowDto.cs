namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

public sealed record PatchBudgetMonthSavingsGoalBulkRowDto(
    Guid MonthSavingsGoalId,
    decimal MonthlyContribution,
    string? Scope = null);
