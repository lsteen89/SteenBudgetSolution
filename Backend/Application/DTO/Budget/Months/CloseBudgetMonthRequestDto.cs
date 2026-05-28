namespace Backend.Application.DTO.Budget.Months;

// CompletedSavingsGoalIds is the set of BudgetMonthSavingsGoal IDs the user
// chose to mark as completed in the close-month review. The list is
// optional; when null/empty close behaves exactly as before. Every ID must
// be one that the backend itself flagged as a candidate — the close
// handler re-validates instead of trusting the frontend.
public sealed record CloseBudgetMonthRequestDto(
    string CarryOverMode,
    IReadOnlyCollection<Guid>? CompletedSavingsGoalIds = null
);
