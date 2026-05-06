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

    // Recap savings & debt profile
    //
    // Drives the closed-month recap savings/debt detail at the comparable
    // closed month (2026-03 vs 2026-01) so that every savings/debt state the
    // surface can render is exercised by deterministic data:
    //   Savings goals
    //     - Emergency Fund: baseline goal, contribution increased in 2026-03
    //       (positive delta vs 2026-01 by SourceSavingsGoalId)
    //     - House Deposit: baseline goal, contribution decreased in 2026-03
    //       (negative delta vs 2026-01 by SourceSavingsGoalId)
    //     - Travel Fund: month-only goal in 2026-03 (current-only, no delta)
    //   Debts
    //     - Student Loan: installment, payment delta vs 2026-01 by SourceDebtId
    //     - Credit Card: revolving, payment delta vs 2026-01 by SourceDebtId
    //     - Phone Financing: month-only debt in 2026-03 (current-only, no delta)
    //
    // Ordering at 2026-03 is deterministic:
    //   Savings goals by MonthlyContribution DESC -> Emergency Fund, House Deposit, Travel Fund
    //   Debts by MonthlyPayment DESC -> Student Loan, Credit Card, Phone Financing
    public static BudgetTimelineProfile RecapSavingsDebt { get; } = BuildRecapSavingsDebtProfile();

    private const decimal RecapSavingsHabit = 1000m;

    private const decimal RecapEmergencyFundContributionBaseline = 1500m;
    private const decimal RecapEmergencyFundContributionMiddle = 2000m;
    private const decimal RecapEmergencyFundAmountSavedBaseline = 12000m;
    private const decimal RecapEmergencyFundAmountSavedMiddle = 14000m;
    private const decimal RecapEmergencyFundTarget = 60000m;

    private const decimal RecapHouseDepositContributionBaseline = 2000m;
    private const decimal RecapHouseDepositContributionMiddle = 1500m;
    private const decimal RecapHouseDepositAmountSavedBaseline = 30000m;
    private const decimal RecapHouseDepositAmountSavedMiddle = 31500m;
    private const decimal RecapHouseDepositTarget = 250000m;

    private const decimal RecapTravelFundContribution = 600m;
    private const decimal RecapTravelFundAmountSaved = 600m;
    private const decimal RecapTravelFundTarget = 12000m;

    // Expected savings total snapshot at the comparable closed month (2026-03):
    // habit + Emergency Fund + House Deposit + Travel Fund.
    private const decimal RecapExpectedSavingsTotalInComparableMonth =
        RecapSavingsHabit
        + RecapEmergencyFundContributionMiddle
        + RecapHouseDepositContributionMiddle
        + RecapTravelFundContribution;

    private const int RecapExpectedActiveSavingsGoalsInComparableMonth = 3;
    private const int RecapExpectedActiveDebtsInComparableMonth = 3;

    private static BudgetTimelineProfile BuildRecapSavingsDebtProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: BudgetTimelineBaselineData.Income,
            Expenses:
            [
                // Keep expenses minimal so savings/debt totals dominate the
                // recap surface and stay easy to reason about.
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 12000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 3200m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: RecapSavingsHabit,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Fund",
                        TargetAmount: RecapEmergencyFundTarget,
                        TargetMonthOffset: 18,
                        AmountSaved: RecapEmergencyFundAmountSavedBaseline,
                        MonthlyContribution: RecapEmergencyFundContributionBaseline),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "House Deposit",
                        TargetAmount: RecapHouseDepositTarget,
                        TargetMonthOffset: 36,
                        AmountSaved: RecapHouseDepositAmountSavedBaseline,
                        MonthlyContribution: RecapHouseDepositContributionBaseline)
                ]),
            Debts:
            [
                // Revolving: monthly payment = MinPayment + MonthlyFee.
                new("Credit Card", "revolving", 18000m, 19.9m, 25m, 500m, null),
                // Installment: monthly payment = Amortize(...) + MonthlyFee,
                // dominates the debt total in the comparable closed month.
                new("Student Loan", "installment", 90000m, 1.5m, 0m, 1300m, 60)
            ]);

        var oldest = BudgetTimelineScenarioData.Empty;

        // 2026-03: shift baseline goal contributions, shift baseline debt
        // balances/min payments, and add one current-only goal + one
        // current-only debt so the recap exercises both delta and current-only
        // shapes.
        var middle = BudgetTimelineScenarioData.Empty with
        {
            SavingsGoalAdjustments =
            [
                new("Emergency Fund",
                    MonthlyContribution: RecapEmergencyFundContributionMiddle,
                    AmountSaved: RecapEmergencyFundAmountSavedMiddle),
                new("House Deposit",
                    MonthlyContribution: RecapHouseDepositContributionMiddle,
                    AmountSaved: RecapHouseDepositAmountSavedMiddle)
            ],
            CreatedSavingsGoals =
            [
                new("Travel Fund",
                    MonthlyContribution: RecapTravelFundContribution,
                    TargetAmount: RecapTravelFundTarget,
                    TargetMonthOffset: 12,
                    AmountSaved: RecapTravelFundAmountSaved)
            ],
            DebtAdjustments =
            [
                new("Credit Card", Balance: 16500m, MinPayment: 600m),
                new("Student Loan", Balance: 88600m, MinPayment: 1350m)
            ],
            CreatedDebts =
            [
                new("Phone Financing",
                    Type: "installment",
                    Balance: 4800m,
                    Apr: 0m,
                    MonthlyFee: 0m,
                    MinPayment: 200m,
                    TermMonths: 24)
            ]
        };

        var open = BudgetTimelineScenarioData.Empty;

        return new BudgetTimelineProfile(
            Name: "recap-savings-debt",
            Baseline: baseline,
            Oldest: oldest,
            Middle: middle,
            Open: open,
            PostCloseInvariantsAsync: VerifyRecapSavingsDebtInvariantsAsync);
    }

    private static async Task VerifyRecapSavingsDebtInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var savingsTotal = await ctx.GetSnapshotSavingsTotalAsync(ctx.YearMonth);
        if (savingsTotal != RecapExpectedSavingsTotalInComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap savings/debt seed invariant failed for {ctx.YearMonth}: " +
                $"savings total snapshot was {savingsTotal}, " +
                $"expected {RecapExpectedSavingsTotalInComparableMonth} " +
                "(habit + Emergency Fund + House Deposit + Travel Fund).");
        }

        var savingsGoalCount = await ctx.CountActiveSavingsGoalsAsync(ctx.YearMonth);
        if (savingsGoalCount != RecapExpectedActiveSavingsGoalsInComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap savings/debt seed invariant failed for {ctx.YearMonth}: " +
                $"active savings goal count was {savingsGoalCount}, " +
                $"expected {RecapExpectedActiveSavingsGoalsInComparableMonth} " +
                "(Emergency Fund + House Deposit + Travel Fund).");
        }

        var debtCount = await ctx.CountActiveDebtsAsync(ctx.YearMonth);
        if (debtCount != RecapExpectedActiveDebtsInComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap savings/debt seed invariant failed for {ctx.YearMonth}: " +
                $"active debt count was {debtCount}, " +
                $"expected {RecapExpectedActiveDebtsInComparableMonth} " +
                "(Credit Card + Student Loan + Phone Financing).");
        }

        // Debt monthly payments are computed by IDebtPaymentCalculator, not
        // stored verbatim, so we only assert the snapshot total is positive
        // rather than pin an exact decimal that depends on amortization rules.
        var debtTotal = await ctx.GetSnapshotDebtPaymentsTotalAsync(ctx.YearMonth);
        if (debtTotal <= 0m)
        {
            throw new InvalidOperationException(
                $"Recap savings/debt seed invariant failed for {ctx.YearMonth}: " +
                $"debt payment total snapshot was {debtTotal}, " +
                "expected a positive value (Credit Card + Student Loan + Phone Financing).");
        }
    }
}
