namespace Backend.Application.DTO.Budget.Months;

// A savings goal that the close-month flow can finish off in one step.
//
// "Projected" reflects what AmountSaved would be once this month's
// contribution lands. The backend does not advance AmountSaved during
// close — the projection is purely a hint used to surface candidates
// and to gate which IDs may be submitted as completions.
public sealed record SavingsGoalCompletionCandidateDto(
    Guid Id,
    Guid? SourceSavingsGoalId,
    string? Name,
    decimal TargetAmount,
    decimal AmountSaved,
    decimal MonthlyContribution,
    decimal ProjectedAmountSaved,
    decimal RemainingAfterContribution
);
