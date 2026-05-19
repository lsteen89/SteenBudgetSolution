namespace Backend.Application.DTO.Budget.Savings;

// Lifecycle state for a savings goal row (plan or month materialization).
// Mirrors the CK_*_Status check on SavingsGoal and BudgetMonthSavingsGoal,
// which only permit 'active' and 'closed'. "completed", "cancelled" and
// "removed" are NOT statuses — they are closed reasons.
public static class SavingsGoalStatuses
{
    public const string Active = "active";
    public const string Closed = "closed";

    public static bool IsSupported(string? value)
        => value == Active || value == Closed;
}

// Why a savings goal became closed. Stored in SavingsGoal.ClosedReason and
// BudgetMonthSavingsGoal.ClosedReason. Must be non-null when Status = closed
// and null when Status = active. There is intentionally no "failed" /
// "abandoned" reason — closure is a neutral lifecycle event.
public static class SavingsGoalClosedReasons
{
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
    public const string Removed = "removed";

    public static bool IsSupported(string? value)
        => value == Completed || value == Cancelled || value == Removed;
}

// User-facing lifecycle actions. Each maps to exactly one closed reason.
// Keep this distinct from SavingsGoalClosedReasons so commands and DTOs can
// speak in verbs ("complete this goal") while storage speaks in reasons.
public static class SavingsGoalLifecycleActions
{
    public const string Complete = "complete";
    public const string Cancel = "cancel";
    public const string Remove = "remove";

    public static bool IsSupported(string? value)
        => value == Complete || value == Cancel || value == Remove;

    public static string? ToClosedReason(string? action) => action switch
    {
        Complete => SavingsGoalClosedReasons.Completed,
        Cancel => SavingsGoalClosedReasons.Cancelled,
        Remove => SavingsGoalClosedReasons.Removed,
        _ => null,
    };
}
