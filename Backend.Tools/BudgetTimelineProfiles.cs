using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Enums;

internal static class BudgetTimelineProfiles
{
    public static BudgetTimelineProfile Default { get; } = new(
        Name: "default",
        Baseline: new BudgetTimelineBaseline(
            Income: BudgetTimelineBaselineData.Income,
            Expenses: BudgetTimelineBaselineData.Expenses,
            Savings: BudgetTimelineBaselineData.Savings,
            Debts: BudgetTimelineBaselineData.Debts),
        Oldest: BudgetTimelineScenarioData.Oldest,
        Middle: BudgetTimelineScenarioData.Middle,
        Open: BudgetTimelineScenarioData.Open);

    // Recap subscriptions profile
    //
    // Drives the closed-month recap subscription block at the comparable
    // closed month (2026-03 vs 2026-01) so that every subscription state the
    // recap surface can render is exercised by deterministic data:
    //   - Streaming TV: still active in 2026-03 by source identity
    //   - Music Now -> Music Premium: renamed in 2026-03, source identity preserved
    //   - Cloud Drive: present in 2026-01, soft-deleted in 2026-03 -> Removed
    //   - News Daily: present in 2026-01, paused in 2026-03 -> Paused
    //   - Workout Plus: present in 2026-01, cancelled in 2026-03 -> Cancelled
    //                   (must NOT also appear as Removed)
    //   - Audiobooks: created month-only in 2026-03 -> New
    public static BudgetTimelineProfile RecapSubscriptions { get; } = BuildRecapSubscriptionsProfile();

    private const decimal RecapStreamingTv = 159m;
    private const decimal RecapMusicNow = 119m;
    private const decimal RecapCloudDrive = 49m;
    private const decimal RecapNewsDaily = 89m;
    private const decimal RecapWorkoutPlus = 199m;
    private const decimal RecapAudiobooks = 129m;

    // Active subscription total in the comparable closed month (2026-03):
    // paused (News Daily) and cancelled (Workout Plus) must be excluded.
    private const decimal RecapExpectedActiveSubscriptionTotalInComparableMonth =
        RecapStreamingTv + RecapMusicNow + RecapAudiobooks;

    private static BudgetTimelineProfile BuildRecapSubscriptionsProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: BudgetTimelineBaselineData.Income,
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 12000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 3200m),
                new(BudgetTimelineBaselineData.TransportCategoryId, "Transport Pass", 850m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Electricity", 720m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Home Internet", 349m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Mobile Plan", 299m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Streaming TV", RecapStreamingTv),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Music Now", RecapMusicNow),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Cloud Drive", RecapCloudDrive),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "News Daily", RecapNewsDaily),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Workout Plus", RecapWorkoutPlus)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: 2000m,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Fund",
                        TargetAmount: 60000m,
                        TargetMonthOffset: 18,
                        AmountSaved: 20000m,
                        MonthlyContribution: 1000m)
                ]),
            Debts:
            [
                new("Credit Card", "revolving", 12000m, 19.9m, 25m, 400m, null)
            ]);

        var oldest = BudgetTimelineScenarioData.Empty;

        // 2026-03 comparable closed month: rename one subscription, soft-delete
        // one, pause one, cancel one, and create a month-only subscription.
        var middle = BudgetTimelineScenarioData.Empty with
        {
            CreatedExpenses =
            [
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Audiobooks", RecapAudiobooks)
            ],
            DeletedExpenses =
            [
                "Cloud Drive"
            ],
            ExpenseRenames =
            [
                new("Music Now", "Music Premium")
            ],
            SubscriptionLifecycleChanges =
            [
                new("News Daily", BudgetMonthSubscriptionLifecycleStatuses.Paused),
                new("Workout Plus", BudgetMonthSubscriptionLifecycleStatuses.Cancelled)
            ]
        };

        var open = BudgetTimelineScenarioData.Empty;

        return new BudgetTimelineProfile(
            Name: "recap-subscriptions",
            Baseline: baseline,
            Oldest: oldest,
            Middle: middle,
            Open: open,
            PostCloseInvariantsAsync: VerifyRecapSubscriptionsInvariantsAsync);
    }

    private static async Task VerifyRecapSubscriptionsInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var activeSum = await ctx.SumActiveSubscriptionAmountAsync(ctx.YearMonth);

        if (activeSum != RecapExpectedActiveSubscriptionTotalInComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap subscriptions seed invariant failed for {ctx.YearMonth}: " +
                $"active subscription total was {activeSum}, " +
                $"expected {RecapExpectedActiveSubscriptionTotalInComparableMonth} " +
                "(paused/cancelled subscriptions must be excluded).");
        }
    }
}
