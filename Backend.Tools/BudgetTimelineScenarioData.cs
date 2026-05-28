internal static class BudgetTimelineScenarioData
{
    public static BudgetTimelineMonthScenario Oldest { get; } = new(
        ExpenseAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        CreatedExpenses: Array.Empty<BudgetTimelineMonthExpenseCreate>(),
        ExpenseActivityChanges: Array.Empty<BudgetTimelineActivityChange>(),
        DeletedExpenses: Array.Empty<string>(),
        ExpenseRenames: Array.Empty<BudgetTimelineExpenseRename>(),
        SubscriptionLifecycleChanges: Array.Empty<BudgetTimelineSubscriptionLifecycleChange>(),
        SideHustleAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        HouseholdMemberAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        SavingsMonthlyOverride: null,
        SavingsGoalAdjustments: Array.Empty<BudgetTimelineSavingsGoalAdjustment>(),
        DebtAdjustments: Array.Empty<BudgetTimelineDebtAdjustment>(),
        CreatedSavingsGoals: Array.Empty<BudgetTimelineMonthSavingsGoalCreate>(),
        CreatedDebts: Array.Empty<BudgetTimelineMonthDebtCreate>());

    public static BudgetTimelineMonthScenario Middle { get; } = new(
        ExpenseAmountOverrides:
        [
            new("Groceries", 3520m),
            new("Electricity", 810m),
            new("Netflix", 179m)
        ],
        CreatedExpenses:
        [
            new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Cloud Storage", 49m)
        ],
        ExpenseActivityChanges: Array.Empty<BudgetTimelineActivityChange>(),
        DeletedExpenses: Array.Empty<string>(),
        ExpenseRenames: Array.Empty<BudgetTimelineExpenseRename>(),
        SubscriptionLifecycleChanges: Array.Empty<BudgetTimelineSubscriptionLifecycleChange>(),
        SideHustleAmountOverrides:
        [
            new("Freelance", 3200m)
        ],
        HouseholdMemberAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        SavingsMonthlyOverride: 3200m,
        SavingsGoalAdjustments:
        [
            new("Emergency Fund", MonthlyContribution: 1700m, AmountSaved: 41700m)
        ],
        DebtAdjustments:
        [
            new("Credit Card", Balance: 17100m),
            new("Student Loan", Balance: 94450m)
        ],
        CreatedSavingsGoals: Array.Empty<BudgetTimelineMonthSavingsGoalCreate>(),
        CreatedDebts: Array.Empty<BudgetTimelineMonthDebtCreate>());

    public static BudgetTimelineMonthScenario Open { get; } = new(
        ExpenseAmountOverrides:
        [
            new("Groceries", 3340m),
            new("Electricity", 960m),
            new("Netflix", 199m)
        ],
        CreatedExpenses:
        [
            new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Cloud Storage", 59m)
        ],
        ExpenseActivityChanges:
        [
            new("Transport Pass", false)
        ],
        DeletedExpenses:
        [
            "Spotify"
        ],
        ExpenseRenames: Array.Empty<BudgetTimelineExpenseRename>(),
        SubscriptionLifecycleChanges: Array.Empty<BudgetTimelineSubscriptionLifecycleChange>(),
        SideHustleAmountOverrides:
        [
            new("Freelance", 2200m)
        ],
        HouseholdMemberAmountOverrides:
        [
            new("Partner contribution", 1500m)
        ],
        SavingsMonthlyOverride: 2800m,
        SavingsGoalAdjustments:
        [
            new("Emergency Fund", MonthlyContribution: 1100m, AmountSaved: 42800m)
        ],
        DebtAdjustments:
        [
            new("Credit Card", Balance: 15850m, MinPayment: 650m),
            new("Student Loan", Balance: 93880m)
        ],
        CreatedSavingsGoals: Array.Empty<BudgetTimelineMonthSavingsGoalCreate>(),
        CreatedDebts: Array.Empty<BudgetTimelineMonthDebtCreate>());

    public static BudgetTimelineMonthScenario Empty { get; } = new(
        ExpenseAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        CreatedExpenses: Array.Empty<BudgetTimelineMonthExpenseCreate>(),
        ExpenseActivityChanges: Array.Empty<BudgetTimelineActivityChange>(),
        DeletedExpenses: Array.Empty<string>(),
        ExpenseRenames: Array.Empty<BudgetTimelineExpenseRename>(),
        SubscriptionLifecycleChanges: Array.Empty<BudgetTimelineSubscriptionLifecycleChange>(),
        SideHustleAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        HouseholdMemberAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        SavingsMonthlyOverride: null,
        SavingsGoalAdjustments: Array.Empty<BudgetTimelineSavingsGoalAdjustment>(),
        DebtAdjustments: Array.Empty<BudgetTimelineDebtAdjustment>(),
        CreatedSavingsGoals: Array.Empty<BudgetTimelineMonthSavingsGoalCreate>(),
        CreatedDebts: Array.Empty<BudgetTimelineMonthDebtCreate>());
}

internal sealed record BudgetTimelineMonthScenario(
    IReadOnlyList<BudgetTimelineAmountOverride> ExpenseAmountOverrides,
    IReadOnlyList<BudgetTimelineMonthExpenseCreate> CreatedExpenses,
    IReadOnlyList<BudgetTimelineActivityChange> ExpenseActivityChanges,
    IReadOnlyList<string> DeletedExpenses,
    IReadOnlyList<BudgetTimelineExpenseRename> ExpenseRenames,
    IReadOnlyList<BudgetTimelineSubscriptionLifecycleChange> SubscriptionLifecycleChanges,
    IReadOnlyList<BudgetTimelineAmountOverride> SideHustleAmountOverrides,
    IReadOnlyList<BudgetTimelineAmountOverride> HouseholdMemberAmountOverrides,
    decimal? SavingsMonthlyOverride,
    IReadOnlyList<BudgetTimelineSavingsGoalAdjustment> SavingsGoalAdjustments,
    IReadOnlyList<BudgetTimelineDebtAdjustment> DebtAdjustments,
    IReadOnlyList<BudgetTimelineMonthSavingsGoalCreate> CreatedSavingsGoals,
    IReadOnlyList<BudgetTimelineMonthDebtCreate> CreatedDebts)
{
    // When true, the seeder NULLs out BudgetMonthSavings.SourceSavingsId for
    // this month after applying the rest of the scenario. This produces the
    // "orphan" shape the Bassparande dialog uses to disable plan-scope writes
    // (FE response carries IsMonthOnly = true). Used by the savings-editor
    // orphan E2E profile.
    public bool ClearSavingsSourceLink { get; init; } = false;
}

internal sealed record BudgetTimelineAmountOverride(string Name, decimal NewAmount);

internal sealed record BudgetTimelineMonthExpenseCreate(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive = true);

internal sealed record BudgetTimelineActivityChange(string Name, bool IsActive);

internal sealed record BudgetTimelineExpenseRename(string FromName, string ToName);

internal sealed record BudgetTimelineSubscriptionLifecycleChange(string Name, string LifecycleStatus);

internal sealed record BudgetTimelineSavingsGoalAdjustment(
    string Name,
    decimal? MonthlyContribution = null,
    decimal? AmountSaved = null);

internal sealed record BudgetTimelineDebtAdjustment(
    string Name,
    decimal? Balance = null,
    decimal? MinPayment = null,
    decimal? MonthlyFee = null);

// Month-only savings goal: inserted into BudgetMonthSavingsGoal with NULL
// SourceSavingsGoalId so the recap surfaces it as a current-only goal (no
// previous-month delta).
internal sealed record BudgetTimelineMonthSavingsGoalCreate(
    string Name,
    decimal MonthlyContribution,
    decimal? TargetAmount = null,
    int? TargetMonthOffset = null,
    decimal? AmountSaved = null);

// Month-only debt: inserted into BudgetMonthDebt with NULL SourceDebtId so
// the recap surfaces it as a current-only debt (no previous-month delta).
internal sealed record BudgetTimelineMonthDebtCreate(
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee = null,
    decimal? MinPayment = null,
    int? TermMonths = null);
