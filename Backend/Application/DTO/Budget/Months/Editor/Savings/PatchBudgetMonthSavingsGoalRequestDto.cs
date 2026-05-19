namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

public sealed record PatchBudgetMonthSavingsGoalRequestDto(
    decimal MonthlyContribution,
    DateOnly? TargetDate = null,
    string? Scope = null);
