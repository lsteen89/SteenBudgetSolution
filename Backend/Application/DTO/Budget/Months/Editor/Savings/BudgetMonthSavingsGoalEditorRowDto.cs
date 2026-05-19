namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

public sealed record BudgetMonthSavingsGoalEditorRowDto(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution,
    string Status,
    string? ClosedReason,
    DateTime? ClosedAt,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault);
