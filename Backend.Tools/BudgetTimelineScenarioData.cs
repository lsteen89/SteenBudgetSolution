internal static class BudgetTimelineScenarioData
{
    public static BudgetTimelineMonthScenario Oldest { get; } = new(
        ExpenseAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        CreatedExpenses: Array.Empty<BudgetTimelineMonthExpenseCreate>(),
        ExpenseActivityChanges: Array.Empty<BudgetTimelineActivityChange>(),
        DeletedExpenses: Array.Empty<string>(),
        SideHustleAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        HouseholdMemberAmountOverrides: Array.Empty<BudgetTimelineAmountOverride>(),
        SavingsMonthlyOverride: null,
        SavingsGoalAdjustments: Array.Empty<BudgetTimelineSavingsGoalAdjustment>(),
        DebtAdjustments: Array.Empty<BudgetTimelineDebtAdjustment>());

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
        ]);

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
        ]);
}

internal sealed record BudgetTimelineMonthScenario(
    IReadOnlyList<BudgetTimelineAmountOverride> ExpenseAmountOverrides,
    IReadOnlyList<BudgetTimelineMonthExpenseCreate> CreatedExpenses,
    IReadOnlyList<BudgetTimelineActivityChange> ExpenseActivityChanges,
    IReadOnlyList<string> DeletedExpenses,
    IReadOnlyList<BudgetTimelineAmountOverride> SideHustleAmountOverrides,
    IReadOnlyList<BudgetTimelineAmountOverride> HouseholdMemberAmountOverrides,
    decimal? SavingsMonthlyOverride,
    IReadOnlyList<BudgetTimelineSavingsGoalAdjustment> SavingsGoalAdjustments,
    IReadOnlyList<BudgetTimelineDebtAdjustment> DebtAdjustments);

internal sealed record BudgetTimelineAmountOverride(string Name, decimal NewAmount);

internal sealed record BudgetTimelineMonthExpenseCreate(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    bool IsActive = true);

internal sealed record BudgetTimelineActivityChange(string Name, bool IsActive);

internal sealed record BudgetTimelineSavingsGoalAdjustment(
    string Name,
    decimal? MonthlyContribution = null,
    decimal? AmountSaved = null);

internal sealed record BudgetTimelineDebtAdjustment(
    string Name,
    decimal? Balance = null,
    decimal? MinPayment = null,
    decimal? MonthlyFee = null);
