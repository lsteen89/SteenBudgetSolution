using Backend.Application.DTO.Budget.Months;

internal sealed record BudgetTimelineBaseline(
    BudgetTimelineIncomeSeed Income,
    IReadOnlyList<BudgetTimelineExpenseSeed> Expenses,
    BudgetTimelineSavingsSeed Savings,
    IReadOnlyList<BudgetTimelineDebtSeed> Debts)
{
    public IReadOnlyList<BudgetTimelineExpenseCategorySeed> AdditionalExpenseCategories { get; init; } =
        Array.Empty<BudgetTimelineExpenseCategorySeed>();
}

internal sealed record BudgetTimelineProfile(
    string Name,
    BudgetTimelineBaseline Baseline,
    BudgetTimelineMonthScenario Oldest,
    BudgetTimelineMonthScenario Middle,
    BudgetTimelineMonthScenario Open,
    Func<BudgetTimelineSeedInvariantContext, Task>? PostCloseInvariantsAsync = null,
    IReadOnlyList<BudgetTimelineMonthPlan>? TimelineMonths = null);

internal sealed record BudgetTimelineMonthPlan(
    string YearMonth,
    BudgetTimelineMonthScenario Scenario,
    string CarryOverMode = BudgetMonthCarryOverModes.Full,
    bool CreateSkippedMonthsBefore = false,
    decimal? TargetFinalBalance = null);

// Hooks the seeder runs after closing the comparable middle month so that
// scenario-specific math (e.g. paused/cancelled subscriptions excluded from the
// active expense total, or savings totals that drift after deltas + month-only
// rows) fails the seed run early instead of silently producing drifted recap
// data.
//
// Each accessor takes the target year-month so profiles can assert against the
// month they care about (typically the closed comparable month).
internal sealed record BudgetTimelineSeedInvariantContext(
    Guid Persoid,
    Guid BudgetMonthId,
    string YearMonth,
    Func<string, Task<decimal>> SumActiveSubscriptionAmountAsync,
    Func<string, Task<BudgetTimelineSnapshotTotals>> GetSnapshotTotalsAsync,
    Func<string, Task<string?>> GetBudgetMonthStatusAsync,
    Func<string, Task<string?>> GetPreviousComparableYearMonthAsync,
    Func<string, Task<decimal>> GetSnapshotSavingsTotalAsync,
    Func<string, Task<decimal>> GetSnapshotDebtPaymentsTotalAsync,
    Func<string, Task<decimal>> GetCarryOverOutcomeAmountAsync,
    Func<string, Task<int>> CountActiveSavingsGoalsAsync,
    Func<string, Task<int>> CountActiveDebtsAsync,
    Func<Task<int>> CountBudgetMonthsAsync,
    Func<string, Task<BudgetTimelineSnapshotTotals>> GetComputedTotalsAsync,
    Func<string, Task<Guid?>> GetSavingsSourceIdAsync);

internal sealed record BudgetTimelineSnapshotTotals(
    decimal TotalIncomeMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtPaymentsMonthly,
    decimal FinalBalanceMonthly);
