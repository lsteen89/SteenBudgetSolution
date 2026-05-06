internal sealed record BudgetTimelineBaseline(
    BudgetTimelineIncomeSeed Income,
    IReadOnlyList<BudgetTimelineExpenseSeed> Expenses,
    BudgetTimelineSavingsSeed Savings,
    IReadOnlyList<BudgetTimelineDebtSeed> Debts);

internal sealed record BudgetTimelineProfile(
    string Name,
    BudgetTimelineBaseline Baseline,
    BudgetTimelineMonthScenario Oldest,
    BudgetTimelineMonthScenario Middle,
    BudgetTimelineMonthScenario Open,
    Func<BudgetTimelineSeedInvariantContext, Task>? PostCloseInvariantsAsync = null);

// Hooks the seeder runs after closing the comparable middle month so that
// scenario-specific math (e.g. paused/cancelled subscriptions excluded from the
// active expense total) fails the seed run early instead of silently producing
// drifted recap data.
internal sealed record BudgetTimelineSeedInvariantContext(
    Guid Persoid,
    Guid BudgetMonthId,
    string YearMonth,
    Func<string, Task<decimal>> SumActiveSubscriptionAmountAsync);
