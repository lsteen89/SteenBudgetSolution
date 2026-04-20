using Backend.Domain.Enums;

internal static class BudgetTimelineBaselineData
{
    public static readonly Guid HousingCategoryId = Guid.Parse("2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21");
    public static readonly Guid FoodCategoryId = Guid.Parse("5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10");
    public static readonly Guid TransportCategoryId = Guid.Parse("5eb2896c-59f9-4a18-8c84-4c2a1659de80");
    public static readonly Guid FixedExpenseCategoryId = Guid.Parse("8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900");
    public static readonly Guid SubscriptionCategoryId = Guid.Parse("9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4");

    public static BudgetTimelineIncomeSeed Income { get; } = new(
        NetSalaryMonthly: 32000m,
        SalaryFrequency: Frequency.Monthly,
        IncomePaymentDayType: "dayOfMonth",
        IncomePaymentDay: 25,
        SideHustles:
        [
            new BudgetTimelineIncomeEntrySeed("Freelance", 2500m, Frequency.Monthly)
        ],
        HouseholdMembers:
        [
            new BudgetTimelineIncomeEntrySeed("Partner contribution", 1800m, Frequency.Monthly)
        ]);

    public static IReadOnlyList<BudgetTimelineExpenseSeed> Expenses { get; } =
    [
        new(HousingCategoryId, "Rent", 12000m),
        new(FoodCategoryId, "Groceries", 3200m),
        new(TransportCategoryId, "Transport Pass", 850m),
        new(FixedExpenseCategoryId, "Electricity", 720m),
        new(FixedExpenseCategoryId, "Home Internet", 349m),
        new(FixedExpenseCategoryId, "Mobile Plan", 299m),
        new(SubscriptionCategoryId, "Netflix", 159m),
        new(SubscriptionCategoryId, "Spotify", 119m)
    ];

    public static BudgetTimelineSavingsSeed Savings { get; } = new(
        MonthlySavings: 3000m,
        Goals:
        [
            new BudgetTimelineSavingsGoalSeed(
                Name: "Emergency Fund",
                TargetAmount: 100000m,
                TargetMonthOffset: 24,
                AmountSaved: 40000m,
                MonthlyContribution: 1500m)
        ]);

    public static IReadOnlyList<BudgetTimelineDebtSeed> Debts { get; } =
    [
        new("Credit Card", "revolving", 18500m, 19.9m, 25m, 500m, null),
        new("Student Loan", "installment", 95000m, 1.2m, 0m, 1500m, 72)
    ];
}

internal sealed record BudgetTimelineIncomeSeed(
    decimal NetSalaryMonthly,
    Frequency SalaryFrequency,
    string IncomePaymentDayType,
    int? IncomePaymentDay,
    IReadOnlyList<BudgetTimelineIncomeEntrySeed> SideHustles,
    IReadOnlyList<BudgetTimelineIncomeEntrySeed> HouseholdMembers);

internal sealed record BudgetTimelineIncomeEntrySeed(
    string Name,
    decimal AmountMonthly,
    Frequency Frequency);

internal sealed record BudgetTimelineExpenseSeed(
    Guid CategoryId,
    string Name,
    decimal AmountMonthly);

internal sealed record BudgetTimelineSavingsSeed(
    decimal MonthlySavings,
    IReadOnlyList<BudgetTimelineSavingsGoalSeed> Goals);

internal sealed record BudgetTimelineSavingsGoalSeed(
    string Name,
    decimal TargetAmount,
    int TargetMonthOffset,
    decimal AmountSaved,
    decimal MonthlyContribution);

internal sealed record BudgetTimelineDebtSeed(
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths);
