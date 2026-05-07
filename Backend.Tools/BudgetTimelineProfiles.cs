using System.Globalization;
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

    // Recap first-closed profile
    //
    // Drives the first closed month recap at 2026-01 where no previous closed
    // comparable month exists. January intentionally closes balanced so the
    // existing full carry-over transition records an outcome amount of 0:
    //   - snapshot totals render with a 0 final balance
    //   - expense categories render current amounts without previous values
    //   - baseline subscriptions are active, not new
    //   - savings/debt detail rows have no previous-month delta cues
    //   - carry-over outcome reads as no carry-over
    public static BudgetTimelineProfile RecapFirstClosed { get; } = BuildRecapFirstClosedProfile();

    private const decimal RecapFirstClosedSubscriptionsTotal = 500m;

    private static BudgetTimelineProfile BuildRecapFirstClosedProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: new BudgetTimelineIncomeSeed(
                NetSalaryMonthly: 12000m,
                SalaryFrequency: Frequency.Monthly,
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                SideHustles: Array.Empty<BudgetTimelineIncomeEntrySeed>(),
                HouseholdMembers: Array.Empty<BudgetTimelineIncomeEntrySeed>()),
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Starter Rent", 4800m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 1400m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Streaming Essentials", 300m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Cloud Backup", 200m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: 1000m,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Buffer",
                        TargetAmount: 30000m,
                        TargetMonthOffset: 18,
                        AmountSaved: 6000m,
                        MonthlyContribution: 1500m)
                ]),
            Debts:
            [
                new("Starter Credit Card", "revolving", 6000m, 15m, 0m, 2800m, null)
            ]);

        return new BudgetTimelineProfile(
            Name: "recap-first-closed",
            Baseline: baseline,
            Oldest: BudgetTimelineScenarioData.Empty,
            Middle: BudgetTimelineScenarioData.Empty,
            Open: BudgetTimelineScenarioData.Empty,
            PostCloseInvariantsAsync: VerifyRecapFirstClosedInvariantsAsync);
    }

    private static async Task VerifyRecapFirstClosedInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var firstClosedYearMonth = ParseSeedYearMonth(ctx.YearMonth)
            .AddMonths(-2)
            .ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var totals = await ctx.GetSnapshotTotalsAsync(firstClosedYearMonth);

        if (totals.FinalBalanceMonthly != 0m)
        {
            throw new InvalidOperationException(
                $"Recap first-closed seed invariant failed for {firstClosedYearMonth}: " +
                $"final balance snapshot was {totals.FinalBalanceMonthly}, expected 0 " +
                "so the first closed month displays no carry-over.");
        }

        var carryOverAmount = await ctx.GetCarryOverOutcomeAmountAsync(firstClosedYearMonth);
        if (carryOverAmount != 0m)
        {
            throw new InvalidOperationException(
                $"Recap first-closed seed invariant failed for {firstClosedYearMonth}: " +
                $"carry-over outcome was {carryOverAmount}, expected 0.");
        }

        var activeSubscriptionTotal = await ctx.SumActiveSubscriptionAmountAsync(firstClosedYearMonth);
        if (activeSubscriptionTotal != RecapFirstClosedSubscriptionsTotal)
        {
            throw new InvalidOperationException(
                $"Recap first-closed seed invariant failed for {firstClosedYearMonth}: " +
                $"active subscription total was {activeSubscriptionTotal}, " +
                $"expected {RecapFirstClosedSubscriptionsTotal}.");
        }

        var savingsGoalCount = await ctx.CountActiveSavingsGoalsAsync(firstClosedYearMonth);
        if (savingsGoalCount != 1)
        {
            throw new InvalidOperationException(
                $"Recap first-closed seed invariant failed for {firstClosedYearMonth}: " +
                $"active savings goal count was {savingsGoalCount}, expected 1.");
        }

        var debtCount = await ctx.CountActiveDebtsAsync(firstClosedYearMonth);
        if (debtCount != 1)
        {
            throw new InvalidOperationException(
                $"Recap first-closed seed invariant failed for {firstClosedYearMonth}: " +
                $"active debt count was {debtCount}, expected 1.");
        }
    }

    // Recap comparison-skip profile
    //
    // Drives a closed-month recap where 2026-02 is deliberately skipped, so
    // 2026-03 must compare against the previous comparable closed month
    // 2026-01. The March deltas are intentionally easy to see:
    //   - income increases from consulting
    //   - Housing increases
    //   - Subscription decreases via a previous-only removed cost
    //   - Food decreases while also containing a current-only row
    //   - Emergency Fund and Credit Card keep source identities with deltas
    public static BudgetTimelineProfile RecapComparisonSkip { get; } = BuildRecapComparisonSkipProfile();

    private const decimal RecapComparisonSkipJanuaryIncome = 42000m;
    private const decimal RecapComparisonSkipJanuaryExpenses = 20500m;
    private const decimal RecapComparisonSkipJanuarySavings = 3500m;
    private const decimal RecapComparisonSkipJanuaryDebtPayments = 2500m;
    private const decimal RecapComparisonSkipJanuaryFinalBalance = 15500m;

    private const decimal RecapComparisonSkipMarchIncome = 43500m;
    private const decimal RecapComparisonSkipMarchExpenses = 19950m;
    private const decimal RecapComparisonSkipMarchSavings = 4800m;
    private const decimal RecapComparisonSkipMarchDebtPayments = 2300m;
    private const decimal RecapComparisonSkipMarchFinalBalance = 16450m;

    private static BudgetTimelineProfile BuildRecapComparisonSkipProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: new BudgetTimelineIncomeSeed(
                NetSalaryMonthly: 40000m,
                SalaryFrequency: Frequency.Monthly,
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                SideHustles:
                [
                    new BudgetTimelineIncomeEntrySeed(
                        "Consulting",
                        2000m,
                        Frequency.Monthly)
                ],
                HouseholdMembers: Array.Empty<BudgetTimelineIncomeEntrySeed>()),
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 12000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 5000m),
                new(BudgetTimelineBaselineData.TransportCategoryId, "Transport Pass", 1500m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Insurance", 1000m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Streaming Plus", 300m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Old Fitness", 700m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: 2000m,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Fund",
                        TargetAmount: 80000m,
                        TargetMonthOffset: 24,
                        AmountSaved: 20000m,
                        MonthlyContribution: 1000m),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Holiday Fund",
                        TargetAmount: 18000m,
                        TargetMonthOffset: 10,
                        AmountSaved: 4500m,
                        MonthlyContribution: 500m)
                ]),
            Debts:
            [
                new("Credit Card", "revolving", 14000m, 18m, 100m, 900m, null),
                new("Car Loan", "revolving", 60000m, 7m, 0m, 1500m, null)
            ]);

        var middle = BudgetTimelineScenarioData.Empty with
        {
            ExpenseAmountOverrides =
            [
                new("Rent", 12500m),
                new("Groceries", 3600m),
                new("Streaming Plus", 450m)
            ],
            CreatedExpenses =
            [
                new(BudgetTimelineBaselineData.FoodCategoryId, "Meal Kit", 900m)
            ],
            DeletedExpenses =
            [
                "Old Fitness"
            ],
            SideHustleAmountOverrides =
            [
                new("Consulting", 3500m)
            ],
            SavingsMonthlyOverride = 2500m,
            SavingsGoalAdjustments =
            [
                new("Emergency Fund", MonthlyContribution: 1600m, AmountSaved: 21600m),
                new("Holiday Fund", MonthlyContribution: 300m, AmountSaved: 4800m)
            ],
            CreatedSavingsGoals =
            [
                new(
                    "March Buffer",
                    MonthlyContribution: 400m,
                    TargetAmount: 12000m,
                    TargetMonthOffset: 8,
                    AmountSaved: 400m)
            ],
            DebtAdjustments =
            [
                new("Credit Card", MinPayment: 1200m),
                new("Car Loan", MinPayment: 1000m)
            ]
        };

        return new BudgetTimelineProfile(
            Name: "recap-comparison-skip",
            Baseline: baseline,
            Oldest: BudgetTimelineScenarioData.Empty,
            Middle: middle,
            Open: BudgetTimelineScenarioData.Empty,
            PostCloseInvariantsAsync: VerifyRecapComparisonSkipInvariantsAsync);
    }

    private static async Task VerifyRecapComparisonSkipInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var januaryYearMonth = ParseSeedYearMonth(ctx.YearMonth)
            .AddMonths(-2)
            .ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var skippedYearMonth = ParseSeedYearMonth(ctx.YearMonth)
            .AddMonths(-1)
            .ToString("yyyy-MM", CultureInfo.InvariantCulture);

        var skippedStatus = await ctx.GetBudgetMonthStatusAsync(skippedYearMonth);
        if (skippedStatus != BudgetMonthStatuses.Skipped)
        {
            throw new InvalidOperationException(
                $"Recap comparison-skip seed invariant failed for {skippedYearMonth}: " +
                $"status was '{skippedStatus}', expected '{BudgetMonthStatuses.Skipped}'.");
        }

        var previousComparableYearMonth = await ctx.GetPreviousComparableYearMonthAsync(ctx.YearMonth);
        if (previousComparableYearMonth != januaryYearMonth)
        {
            throw new InvalidOperationException(
                $"Recap comparison-skip seed invariant failed for {ctx.YearMonth}: " +
                $"previous comparable month was '{previousComparableYearMonth}', expected '{januaryYearMonth}'.");
        }

        var januaryTotals = await ctx.GetSnapshotTotalsAsync(januaryYearMonth);
        AssertSnapshotTotals(
            scenarioName: "Recap comparison-skip",
            yearMonth: januaryYearMonth,
            actual: januaryTotals,
            expected: new BudgetTimelineSnapshotTotals(
                RecapComparisonSkipJanuaryIncome,
                RecapComparisonSkipJanuaryExpenses,
                RecapComparisonSkipJanuarySavings,
                RecapComparisonSkipJanuaryDebtPayments,
                RecapComparisonSkipJanuaryFinalBalance));

        var marchTotals = await ctx.GetSnapshotTotalsAsync(ctx.YearMonth);
        AssertSnapshotTotals(
            scenarioName: "Recap comparison-skip",
            yearMonth: ctx.YearMonth,
            actual: marchTotals,
            expected: new BudgetTimelineSnapshotTotals(
                RecapComparisonSkipMarchIncome,
                RecapComparisonSkipMarchExpenses,
                RecapComparisonSkipMarchSavings,
                RecapComparisonSkipMarchDebtPayments,
                RecapComparisonSkipMarchFinalBalance));
    }

    private static void AssertSnapshotTotals(
        string scenarioName,
        string yearMonth,
        BudgetTimelineSnapshotTotals actual,
        BudgetTimelineSnapshotTotals expected)
    {
        if (actual.TotalIncomeMonthly == expected.TotalIncomeMonthly &&
            actual.TotalExpensesMonthly == expected.TotalExpensesMonthly &&
            actual.TotalSavingsMonthly == expected.TotalSavingsMonthly &&
            actual.TotalDebtPaymentsMonthly == expected.TotalDebtPaymentsMonthly &&
            actual.FinalBalanceMonthly == expected.FinalBalanceMonthly)
        {
            return;
        }

        throw new InvalidOperationException(
            $"{scenarioName} seed invariant failed for {yearMonth}: " +
            $"snapshot totals were income={actual.TotalIncomeMonthly}, " +
            $"expenses={actual.TotalExpensesMonthly}, " +
            $"savings={actual.TotalSavingsMonthly}, " +
            $"debtPayments={actual.TotalDebtPaymentsMonthly}, " +
            $"finalBalance={actual.FinalBalanceMonthly}. Expected " +
            $"income={expected.TotalIncomeMonthly}, " +
            $"expenses={expected.TotalExpensesMonthly}, " +
            $"savings={expected.TotalSavingsMonthly}, " +
            $"debtPayments={expected.TotalDebtPaymentsMonthly}, " +
            $"finalBalance={expected.FinalBalanceMonthly}.");
    }

    private static DateTime ParseSeedYearMonth(string yearMonth)
        => DateTime.ParseExact(
            $"{yearMonth}-01",
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

    // Recap Sankey/category stress profile
    //
    // Drives the closed-month recap hero Sankey and category comparison at the
    // comparable closed month (2026-03 vs 2026-01) with deliberately large but
    // exact decimal values:
    //   - large income, expense, savings, debt-payment and final-balance totals
    //   - long category labels in the category comparison chart/list
    //   - current-only category: previous value is 0, so deltaPercent is null
    //   - previous-only category: present in 2026-01, deleted in 2026-03
    //   - deterministic top two expense increase drivers: current-only category
    //     and Food
    //   - full carry-over from 2026-03 to 2026-04 equals the closed snapshot
    //     final balance, proving the recap can display carry-over separately
    //     from income totals.
    private static readonly Guid RecapSankeyCurrentOnlyCategoryId =
        Guid.Parse("8a2b1bc8-8de0-4f41-b4dd-75f6f449e1bf");
    private static readonly Guid RecapSankeyPreviousOnlyCategoryId =
        Guid.Parse("f36baf7f-3e55-498b-8f9a-cb4f8db59851");

    private const string RecapSankeyCurrentOnlyCategoryName =
        "Current Only Category With A Very Long Sankey Stress Label";
    private const string RecapSankeyPreviousOnlyCategoryName =
        "Previous Only Category With A Very Long Archived Label";

    private const decimal RecapSankeyExpectedIncomeInComparableMonth = 630000m;
    private const decimal RecapSankeyExpectedExpensesInComparableMonth = 293000m;
    private const decimal RecapSankeyExpectedSavingsInComparableMonth = 145000m;
    private const decimal RecapSankeyExpectedDebtPaymentsInComparableMonth = 52500m;
    private const decimal RecapSankeyExpectedFinalBalanceInComparableMonth = 139500m;
    private const decimal RecapSankeyExpectedCarryOverFromComparableMonth = 139500m;

    public static BudgetTimelineProfile RecapSankeyStress { get; } = BuildRecapSankeyStressProfile();

    private static BudgetTimelineProfile BuildRecapSankeyStressProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: new BudgetTimelineIncomeSeed(
                NetSalaryMonthly: 420000m,
                SalaryFrequency: Frequency.Monthly,
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                SideHustles:
                [
                    new BudgetTimelineIncomeEntrySeed(
                        "Quarterly Consultancy Retainer",
                        75000m,
                        Frequency.Monthly)
                ],
                HouseholdMembers:
                [
                    new BudgetTimelineIncomeEntrySeed(
                        "Partner Executive Contribution",
                        65000m,
                        Frequency.Monthly)
                ]),
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Family Home Mortgage", 90000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 18000m),
                new(BudgetTimelineBaselineData.TransportCategoryId, "Transport Pass", 7000m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Utilities And Insurance Bundle", 22000m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Professional Tooling Suite", 6500m),
                new(RecapSankeyPreviousOnlyCategoryId, "Archived School Term Fees", 28000m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: 60000m,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Long Horizon Reserve",
                        TargetAmount: 1200000m,
                        TargetMonthOffset: 36,
                        AmountSaved: 300000m,
                        MonthlyContribution: 45000m)
                ]),
            Debts:
            [
                new("Legacy Credit Line", "revolving", 250000m, 18m, 750m, 18000m, null),
                new("Tax Repayment Plan", "revolving", 130000m, 0m, 0m, 10500m, null)
            ])
        {
            AdditionalExpenseCategories =
            [
                new BudgetTimelineExpenseCategorySeed(
                    RecapSankeyCurrentOnlyCategoryId,
                    RecapSankeyCurrentOnlyCategoryName),
                new BudgetTimelineExpenseCategorySeed(
                    RecapSankeyPreviousOnlyCategoryId,
                    RecapSankeyPreviousOnlyCategoryName)
            ]
        };

        var oldest = BudgetTimelineScenarioData.Empty;

        var middle = BudgetTimelineScenarioData.Empty with
        {
            ExpenseAmountOverrides =
            [
                new("Family Home Mortgage", 112000m),
                new("Groceries", 56000m),
                new("Transport Pass", 16500m),
                new("Utilities And Insurance Bundle", 38000m)
            ],
            CreatedExpenses =
            [
                new(
                    RecapSankeyCurrentOnlyCategoryId,
                    "Current Month Category Spike",
                    64000m)
            ],
            DeletedExpenses =
            [
                "Archived School Term Fees"
            ],
            SideHustleAmountOverrides =
            [
                new("Quarterly Consultancy Retainer", 125000m)
            ],
            HouseholdMemberAmountOverrides =
            [
                new("Partner Executive Contribution", 85000m)
            ],
            SavingsMonthlyOverride = 80000m,
            SavingsGoalAdjustments =
            [
                new(
                    "Long Horizon Reserve",
                    MonthlyContribution: 65000m,
                    AmountSaved: 365000m)
            ],
            DebtAdjustments =
            [
                new("Legacy Credit Line", MinPayment: 32000m, MonthlyFee: 1500m),
                new("Tax Repayment Plan", MinPayment: 19000m)
            ]
        };

        var open = BudgetTimelineScenarioData.Empty;

        return new BudgetTimelineProfile(
            Name: "recap-sankey-stress",
            Baseline: baseline,
            Oldest: oldest,
            Middle: middle,
            Open: open,
            PostCloseInvariantsAsync: VerifyRecapSankeyStressInvariantsAsync);
    }

    private static async Task VerifyRecapSankeyStressInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var totals = await ctx.GetSnapshotTotalsAsync(ctx.YearMonth);

        if (totals.TotalIncomeMonthly != RecapSankeyExpectedIncomeInComparableMonth ||
            totals.TotalExpensesMonthly != RecapSankeyExpectedExpensesInComparableMonth ||
            totals.TotalSavingsMonthly != RecapSankeyExpectedSavingsInComparableMonth ||
            totals.TotalDebtPaymentsMonthly != RecapSankeyExpectedDebtPaymentsInComparableMonth ||
            totals.FinalBalanceMonthly != RecapSankeyExpectedFinalBalanceInComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap Sankey stress seed invariant failed for {ctx.YearMonth}: " +
                $"snapshot totals were income={totals.TotalIncomeMonthly}, " +
                $"expenses={totals.TotalExpensesMonthly}, " +
                $"savings={totals.TotalSavingsMonthly}, " +
                $"debtPayments={totals.TotalDebtPaymentsMonthly}, " +
                $"finalBalance={totals.FinalBalanceMonthly}. Expected " +
                $"income={RecapSankeyExpectedIncomeInComparableMonth}, " +
                $"expenses={RecapSankeyExpectedExpensesInComparableMonth}, " +
                $"savings={RecapSankeyExpectedSavingsInComparableMonth}, " +
                $"debtPayments={RecapSankeyExpectedDebtPaymentsInComparableMonth}, " +
                $"finalBalance={RecapSankeyExpectedFinalBalanceInComparableMonth}.");
        }

        var carryOverAmount = await ctx.GetCarryOverOutcomeAmountAsync(ctx.YearMonth);
        if (carryOverAmount != RecapSankeyExpectedCarryOverFromComparableMonth)
        {
            throw new InvalidOperationException(
                $"Recap Sankey stress seed invariant failed for {ctx.YearMonth}: " +
                $"carry-over outcome was {carryOverAmount}, " +
                $"expected {RecapSankeyExpectedCarryOverFromComparableMonth}.");
        }
    }
}
