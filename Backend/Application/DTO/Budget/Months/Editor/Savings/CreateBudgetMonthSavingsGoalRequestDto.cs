namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

public sealed record CreateBudgetMonthSavingsGoalRequestDto(
    string Name,
    decimal TargetAmount,
    DateOnly? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution);
