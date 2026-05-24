using System.Globalization;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Enums;

// Local-only constant: the open year-month the E2E seed builds. Mirrors
// Program.DefaultBudgetOpenYearMonth so the savings invariants can assert
// against the open month without taking a dependency on the CLI entry point.

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

    // Expected savings total snapshot at the comparable closed month (2026-03).
    //
    // Since commit fff019ac ("fix(budget): keep goal allocations out of
    // savings total") `TotalSavingsMonthly` is the base habit alone — goal
    // contributions are allocation detail and no longer add on top. So the
    // snapshot at 2026-03 equals `RecapSavingsHabit` (1000).
    private const decimal RecapExpectedSavingsTotalInComparableMonth =
        RecapSavingsHabit;

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
                "(base habit only — goal contributions are allocation detail).");
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

    // Savings editor profile (E2E)
    //
    // Drives the open month at 2026-04 for the Playwright savings editor suite.
    // The open month must have:
    //   - a non-zero base habit (Savings.MonthlySavings) so the bassparande row
    //     and the balance-strip baseSavings term both render real numbers,
    //   - 2-3 active savings goals with DISTINCT monthly contributions so the
    //     Justera mål dialog has something to chew on and ordering is stable,
    //   - 1-2 plan-level savings methods so the methods strip is not empty,
    //   - income / expenses / debts populated so the six-term Kvar identity
    //     (income + carry − expenses − base − goals − debts) has every term.
    // Closed months (oldest, middle) intentionally keep the default scenario
    // shape — the savings specs only navigate the open month.
    public static BudgetTimelineProfile SavingsEditor { get; } = BuildSavingsEditorProfile();

    private const decimal SavingsEditorBaseHabit = 1500m;
    private const decimal SavingsEditorEmergencyContribution = 2000m;
    private const decimal SavingsEditorVacationContribution = 1200m;
    private const decimal SavingsEditorComputerContribution = 800m;

    private static BudgetTimelineProfile BuildSavingsEditorProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: BudgetTimelineBaselineData.Income,
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 12000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 3200m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Electricity", 720m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: SavingsEditorBaseHabit,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Fund",
                        TargetAmount: 60000m,
                        TargetMonthOffset: 18,
                        AmountSaved: 20000m,
                        MonthlyContribution: SavingsEditorEmergencyContribution),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Vacation Fund",
                        TargetAmount: 24000m,
                        TargetMonthOffset: 12,
                        AmountSaved: 6000m,
                        MonthlyContribution: SavingsEditorVacationContribution),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Computer Replacement",
                        TargetAmount: 20000m,
                        TargetMonthOffset: 10,
                        AmountSaved: 4000m,
                        MonthlyContribution: SavingsEditorComputerContribution)
                ])
            {
                // Two system methods so the methods strip renders chips out of
                // the box. Funds / Cash stay unused so the editor still has
                // suggestions available for the "add via suggestion" spec.
                Methods =
                [
                    new(SavingsMethodCodes.SavingsAccount),
                    new(SavingsMethodCodes.Isk)
                ]
            },
            Debts:
            [
                new("Credit Card", "revolving", 12000m, 19.9m, 25m, 400m, null)
            ]);

        return new BudgetTimelineProfile(
            Name: "savings-editor",
            Baseline: baseline,
            Oldest: BudgetTimelineScenarioData.Empty,
            Middle: BudgetTimelineScenarioData.Empty,
            Open: BudgetTimelineScenarioData.Empty,
            PostCloseInvariantsAsync: VerifySavingsEditorInvariantsAsync);
    }

    private static async Task VerifySavingsEditorInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        // The open month is one ahead of the closed comparable month the
        // recap invariants assert on. Compute it via the same date helpers
        // RecapComparisonSkip uses.
        var openYearMonth = ParseSeedYearMonth(ctx.YearMonth)
            .AddMonths(1)
            .ToString("yyyy-MM", CultureInfo.InvariantCulture);

        var goalCount = await ctx.CountActiveSavingsGoalsAsync(openYearMonth);
        if (goalCount != 3)
        {
            throw new InvalidOperationException(
                $"Savings editor seed invariant failed for {openYearMonth}: " +
                $"active savings goal count was {goalCount}, expected 3 " +
                "(Emergency Fund + Vacation Fund + Computer Replacement).");
        }

        var sourceId = await ctx.GetSavingsSourceIdAsync(openYearMonth);
        if (sourceId is null)
        {
            throw new InvalidOperationException(
                $"Savings editor seed invariant failed for {openYearMonth}: " +
                "BudgetMonthSavings.SourceSavingsId was NULL, expected a " +
                "plan-linked savings row (orphan shape belongs to the " +
                "savings-orphan profile).");
        }
    }

    // Savings orphan profile (E2E)
    //
    // Same baseline as the savings-editor profile, but the open month's
    // materialized BudgetMonthSavings row is forcibly orphaned (SourceSavingsId
    // IS NULL) so the bassparande dialog renders with the plan-scope cards
    // disabled and the PATCH endpoint rejects plan-scope writes with
    // BaseSavings.PlanMissing.
    public static BudgetTimelineProfile SavingsOrphan { get; } = BuildSavingsOrphanProfile();

    private const decimal SavingsOrphanBaseHabit = 800m;

    private static BudgetTimelineProfile BuildSavingsOrphanProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: BudgetTimelineBaselineData.Income,
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 10500m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 2800m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: SavingsOrphanBaseHabit,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Starter Buffer",
                        TargetAmount: 20000m,
                        TargetMonthOffset: 18,
                        AmountSaved: 2000m,
                        MonthlyContribution: 500m)
                ]),
            Debts:
            [
                new("Phone Plan Debt", "revolving", 2400m, 0m, 0m, 200m, null)
            ]);

        // ClearSavingsSourceLink fires on the open month only — closed months
        // keep their normal plan-linked shape so the timeline still closes
        // cleanly. The orphan rule is asserted by the invariant below.
        var open = BudgetTimelineScenarioData.Empty with
        {
            ClearSavingsSourceLink = true
        };

        return new BudgetTimelineProfile(
            Name: "savings-orphan",
            Baseline: baseline,
            Oldest: BudgetTimelineScenarioData.Empty,
            Middle: BudgetTimelineScenarioData.Empty,
            Open: open,
            PostCloseInvariantsAsync: VerifySavingsOrphanInvariantsAsync);
    }

    private static async Task VerifySavingsOrphanInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var openYearMonth = ParseSeedYearMonth(ctx.YearMonth)
            .AddMonths(1)
            .ToString("yyyy-MM", CultureInfo.InvariantCulture);

        var sourceId = await ctx.GetSavingsSourceIdAsync(openYearMonth);
        if (sourceId is not null)
        {
            throw new InvalidOperationException(
                $"Savings orphan seed invariant failed for {openYearMonth}: " +
                $"BudgetMonthSavings.SourceSavingsId was {sourceId}, expected NULL " +
                "(the orphan shape is the entire reason this profile exists; " +
                "a regression here would silently turn the orphan spec into a " +
                "happy-path spec).");
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
                // Starter Rent is bumped by 1500 (from 4800) to absorb the
                // Emergency Buffer monthly contribution that commit fff019ac
                // moved out of TotalSavingsMonthly. Without this the snapshot
                // final balance would land at +1500 instead of 0, and the
                // first-closed spec (which asserts "no carry-over") would
                // start surfacing a carry-over.
                new(BudgetTimelineBaselineData.HousingCategoryId, "Starter Rent", 6300m),
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

    // Snapshot expectations recalibrated for the new TotalSavingsMonthly
    // semantic (commit fff019ac): the habit alone, not habit + goals. Final
    // balance grows by the goal-contribution total that's no longer
    // double-counted.
    //   January: 2 goals × 1000 + 500 = 1500 moved out of savings into balance
    //   March:   3 goals × 1600 + 300 + 400 = 2300 moved out
    private const decimal RecapComparisonSkipJanuaryIncome = 42000m;
    private const decimal RecapComparisonSkipJanuaryExpenses = 20500m;
    private const decimal RecapComparisonSkipJanuarySavings = 2000m;
    private const decimal RecapComparisonSkipJanuaryDebtPayments = 2500m;
    private const decimal RecapComparisonSkipJanuaryFinalBalance = 17000m;

    private const decimal RecapComparisonSkipMarchIncome = 43500m;
    private const decimal RecapComparisonSkipMarchExpenses = 19950m;
    private const decimal RecapComparisonSkipMarchSavings = 2500m;
    private const decimal RecapComparisonSkipMarchDebtPayments = 2300m;
    // March final balance = Jan carry-over (17 000) + March standalone (18 750).
    // Both shifted by the goal-contribution sums (1 500 / 2 300) that commit
    // fff019ac no longer subtracts from the final balance.
    private const decimal RecapComparisonSkipMarchFinalBalance = 35750m;

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

    // Since commit fff019ac the savings snapshot total no longer adds goal
    // contributions on top of the base habit. The Sankey stress profile's
    // base habit override at 2026-03 is 80 000 (SavingsMonthlyOverride below),
    // so the closed savings snapshot is now 80 000 — not 145 000 — and the
    // final balance grows by the previously-double-counted 65 000 goal
    // contribution. Carry-over follows the final balance.
    private const decimal RecapSankeyExpectedIncomeInComparableMonth = 630000m;
    private const decimal RecapSankeyExpectedExpensesInComparableMonth = 293000m;
    private const decimal RecapSankeyExpectedSavingsInComparableMonth = 80000m;
    private const decimal RecapSankeyExpectedDebtPaymentsInComparableMonth = 52500m;
    private const decimal RecapSankeyExpectedFinalBalanceInComparableMonth = 503750m;
    private const decimal RecapSankeyExpectedCarryOverFromComparableMonth = 503750m;

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

    // Local developer year-history profile
    //
    // A rich local-only playground account for manual product development.
    // This deliberately does not back a brittle Playwright fixture: the E2E
    // seed flow owns focused regression accounts, while this profile gives
    // developers a year-ish timeline with skipped, closed, and open states.
    public static BudgetTimelineProfile LocalDevYearHistory { get; } = BuildLocalDevYearHistoryProfile();

    // NOTE: Per the goals-included savings-total contract
    // (BudgetMonthlyTotalsService), each *Savings constant is the per-month
    // total savings outflow: MonthlySavings + Σ goal MonthlyContribution.
    // Goal allocations are an additional outflow on top of the bassparande
    // base, not allocation detail of it.
    // *FinalBalance = Income - Expenses - Savings - DebtPayments.
    private const decimal LocalDevApril2025Income = 54000m;
    private const decimal LocalDevApril2025Expenses = 30095m;
    private const decimal LocalDevApril2025Savings = 7800m;
    private const decimal LocalDevApril2025DebtPayments = 2935m;
    private const decimal LocalDevApril2025FinalBalance = 13170m;

    private const decimal LocalDevJune2025Income = 65500m;
    private const decimal LocalDevJune2025Expenses = 31895m;
    private const decimal LocalDevJune2025Savings = 9500m;
    private const decimal LocalDevJune2025DebtPayments = 3185m;
    private const decimal LocalDevJune2025FinalBalance = 20920m;

    private const decimal LocalDevDecember2025Income = 54000m;
    private const decimal LocalDevDecember2025Expenses = 46696m;
    private const decimal LocalDevDecember2025Savings = 4500m;
    private const decimal LocalDevDecember2025DebtPayments = 3185m;
    private const decimal LocalDevDecember2025FinalBalance = -381m;

    private const decimal LocalDevMarch2026Income = 56500m;
    private const decimal LocalDevMarch2026Expenses = 30095m;
    private const decimal LocalDevMarch2026Savings = 7200m;
    private const decimal LocalDevMarch2026DebtPayments = 2685m;
    private const decimal LocalDevMarch2026FinalBalance = 16520m;

    // Goals-included contract: open month natural final balance with the
    // current seed (3000 bassparande + 4000 goals + 2535 debts vs 53500
    // income + 20420 carry - 67435 expenses) is -3050.
    // AdjustMonthFinalBalanceAsync can only push down via expenses, so the
    // forced target must match (or sit below) the natural state.
    private const decimal LocalDevApril2026OpenFinalBalance = -3050m;
    private const decimal LocalDevDecember2025ActiveSubscriptionTotal = 466m;

    private static BudgetTimelineProfile BuildLocalDevYearHistoryProfile()
    {
        var baseline = new BudgetTimelineBaseline(
            Income: new BudgetTimelineIncomeSeed(
                NetSalaryMonthly: 42000m,
                SalaryFrequency: Frequency.Monthly,
                IncomePaymentDayType: "dayOfMonth",
                IncomePaymentDay: 25,
                SideHustles:
                [
                    new BudgetTimelineIncomeEntrySeed("Freelance", 3500m, Frequency.Monthly)
                ],
                HouseholdMembers:
                [
                    new BudgetTimelineIncomeEntrySeed("Partner contribution", 8500m, Frequency.Monthly)
                ]),
            Expenses:
            [
                new(BudgetTimelineBaselineData.HousingCategoryId, "Rent", 15000m),
                new(BudgetTimelineBaselineData.FoodCategoryId, "Groceries", 6200m),
                new(BudgetTimelineBaselineData.TransportCategoryId, "Transport Pass", 1200m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Utilities", 1800m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Insurance", 900m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Childcare", 3500m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Home Internet", 450m),
                new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Mobile Plan", 380m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "StreamBox", 169m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Music Basic", 119m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Cloud Drive", 79m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "News Daily", 99m),
                new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Fitness App", 199m)
            ],
            Savings: new BudgetTimelineSavingsSeed(
                MonthlySavings: 3500m,
                Goals:
                [
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Emergency Fund",
                        TargetAmount: 120000m,
                        TargetMonthOffset: 24,
                        AmountSaved: 52000m,
                        MonthlyContribution: 2200m),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Vacation Fund",
                        TargetAmount: 36000m,
                        TargetMonthOffset: 10,
                        AmountSaved: 12000m,
                        MonthlyContribution: 1200m),
                    new BudgetTimelineSavingsGoalSeed(
                        Name: "Home Repair",
                        TargetAmount: 50000m,
                        TargetMonthOffset: 18,
                        AmountSaved: 18000m,
                        MonthlyContribution: 900m)
                ])
            {
                // Rich showcase for the local-dev playground so the savings
                // editor chip strip renders multiple system vehicles plus one
                // custom row. Other profiles intentionally leave Methods empty
                // so the empty state is still exercised elsewhere.
                Methods =
                [
                    new(SavingsMethodCodes.SavingsAccount),
                    new(SavingsMethodCodes.Isk),
                    new(SavingsMethodCodes.Funds),
                    new(SavingsMethodCodes.Cash),
                    new(SavingsMethodCodes.Custom, "Avanza buffert"),
                ]
            },
            Debts:
            [
                new("Credit Card", "revolving", 28000m, 19.9m, 35m, 900m, null),
                new("Car Loan", "installment", 120000m, 0m, 0m, null, 60)
            ]);

        var timeline = new BudgetTimelineMonthPlan[]
        {
            new(
                "2025-04",
                BudgetTimelineScenarioData.Empty,
                BudgetMonthCarryOverModes.None),
            new(
                "2025-05",
                BudgetTimelineScenarioData.Empty with
                {
                    ExpenseAmountOverrides =
                    [
                        new("Groceries", 6400m)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 500m)
                    ],
                    HouseholdMemberAmountOverrides =
                    [
                        new("Partner contribution", 8000m)
                    ],
                    SavingsMonthlyOverride = 2500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 1800m, AmountSaved: 53800m),
                        new("Vacation Fund", MonthlyContribution: 800m, AmountSaved: 12800m),
                        new("Home Repair", MonthlyContribution: 600m, AmountSaved: 18600m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 27100m, MinPayment: 950m),
                        new("Car Loan", Balance: 118800m)
                    ]
                },
                BudgetMonthCarryOverModes.Full),
            new(
                "2025-06",
                BudgetTimelineScenarioData.Empty with
                {
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Concert Weekend", 1800m)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 14500m)
                    ],
                    HouseholdMemberAmountOverrides =
                    [
                        new("Partner contribution", 9000m)
                    ],
                    SavingsMonthlyOverride = 3500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 3000m, AmountSaved: 56800m),
                        new("Vacation Fund", MonthlyContribution: 1800m, AmountSaved: 14600m),
                        new("Home Repair", MonthlyContribution: 1200m, AmountSaved: 19800m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 26000m, MinPayment: 1200m),
                        new("Car Loan", Balance: 117000m)
                    ]
                },
                BudgetMonthCarryOverModes.None),
            new(
                "2025-07",
                BudgetTimelineScenarioData.Empty with
                {
                    ExpenseAmountOverrides =
                    [
                        new("Groceries", 7000m),
                        new("Utilities", 2200m)
                    ],
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Vet Bill", 8000m)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 0m)
                    ],
                    HouseholdMemberAmountOverrides =
                    [
                        new("Partner contribution", 7000m)
                    ],
                    SavingsMonthlyOverride = 1800m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 1000m, AmountSaved: 57800m),
                        new("Vacation Fund", MonthlyContribution: 300m, AmountSaved: 14900m),
                        new("Home Repair", MonthlyContribution: 300m, AmountSaved: 20100m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 25000m, MinPayment: 1300m),
                        new("Car Loan", Balance: 114000m)
                    ]
                },
                BudgetMonthCarryOverModes.Full),
            new(
                "2025-08",
                BudgetTimelineScenarioData.Empty with
                {
                    ExpenseAmountOverrides =
                    [
                        new("Groceries", 6600m)
                    ],
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Appliance Replacement", 18000m)
                    ],
                    SavingsMonthlyOverride = 2500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 1500m, AmountSaved: 59300m),
                        new("Vacation Fund", MonthlyContribution: 600m, AmountSaved: 15500m),
                        new("Home Repair", MonthlyContribution: 400m, AmountSaved: 20500m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 23800m, MinPayment: 1300m),
                        new("Car Loan", Balance: 112800m)
                    ]
                },
                BudgetMonthCarryOverModes.Full),
            new(
                "2025-10",
                BudgetTimelineScenarioData.Empty with
                {
                    SubscriptionLifecycleChanges =
                    [
                        new("News Daily", BudgetMonthSubscriptionLifecycleStatuses.Paused)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 4000m)
                    ],
                    HouseholdMemberAmountOverrides =
                    [
                        new("Partner contribution", 10000m)
                    ],
                    SavingsMonthlyOverride = 3500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2200m, AmountSaved: 61500m),
                        new("Vacation Fund", MonthlyContribution: 1000m, AmountSaved: 16500m),
                        new("Home Repair", MonthlyContribution: 900m, AmountSaved: 21400m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 22600m, MinPayment: 1100m),
                        new("Car Loan", Balance: 111000m)
                    ]
                },
                BudgetMonthCarryOverModes.None,
                CreateSkippedMonthsBefore: true),
            new(
                "2025-11",
                BudgetTimelineScenarioData.Empty with
                {
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Language App", 149m)
                    ],
                    ExpenseRenames =
                    [
                        new("Music Basic", "Music Premium")
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 5000m)
                    ],
                    SavingsMonthlyOverride = 3500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2400m, AmountSaved: 63900m),
                        new("Vacation Fund", MonthlyContribution: 1100m, AmountSaved: 17600m),
                        new("Home Repair", MonthlyContribution: 1000m, AmountSaved: 22400m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 21600m, MinPayment: 1000m),
                        new("Car Loan", Balance: 108000m)
                    ]
                },
                BudgetMonthCarryOverModes.Full),
            new(
                "2025-12",
                BudgetTimelineScenarioData.Empty with
                {
                    ExpenseAmountOverrides =
                    [
                        new("Utilities", 2600m)
                    ],
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Medical Bill", 16000m)
                    ],
                    SubscriptionLifecycleChanges =
                    [
                        new("Fitness App", BudgetMonthSubscriptionLifecycleStatuses.Cancelled)
                    ],
                    SavingsMonthlyOverride = 2500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 1200m, AmountSaved: 65100m),
                        new("Vacation Fund", MonthlyContribution: 500m, AmountSaved: 18100m),
                        new("Home Repair", MonthlyContribution: 300m, AmountSaved: 22700m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 20500m, MinPayment: 1400m),
                        new("Car Loan", Balance: 105000m)
                    ]
                },
                BudgetMonthCarryOverModes.None),
            new(
                "2026-01",
                BudgetTimelineScenarioData.Empty with
                {
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Winter Trip Deposit", 5000m)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 6500m)
                    ],
                    CreatedSavingsGoals =
                    [
                        new("Laptop Replacement",
                            MonthlyContribution: 700m,
                            TargetAmount: 18000m,
                            TargetMonthOffset: 7,
                            AmountSaved: 700m)
                    ],
                    SavingsMonthlyOverride = 3000m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2400m, AmountSaved: 67500m),
                        new("Vacation Fund", MonthlyContribution: 700m, AmountSaved: 18800m),
                        new("Home Repair", MonthlyContribution: 600m, AmountSaved: 23300m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 19600m, MinPayment: 950m),
                        new("Car Loan", Balance: 102000m)
                    ]
                },
                BudgetMonthCarryOverModes.None),
            new(
                "2026-02",
                BudgetTimelineScenarioData.Empty with
                {
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.SubscriptionCategoryId, "Security Monitoring", 129m)
                    ],
                    DeletedExpenses =
                    [
                        "Cloud Drive"
                    ],
                    ExpenseRenames =
                    [
                        new("Music Basic", "Music Premium")
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 4500m)
                    ],
                    SavingsMonthlyOverride = 3500m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2600m, AmountSaved: 70100m),
                        new("Vacation Fund", MonthlyContribution: 1100m, AmountSaved: 19900m),
                        new("Home Repair", MonthlyContribution: 800m, AmountSaved: 24100m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 18800m, MinPayment: 850m),
                        new("Car Loan", Balance: 99000m)
                    ]
                },
                BudgetMonthCarryOverModes.Full),
            new(
                "2026-03",
                BudgetTimelineScenarioData.Empty with
                {
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 6000m)
                    ],
                    CreatedDebts =
                    [
                        new("Phone Financing",
                            Type: "installment",
                            Balance: 3000m,
                            Apr: 0m,
                            MonthlyFee: 0m,
                            MinPayment: null,
                            TermMonths: 12)
                    ],
                    SavingsMonthlyOverride = 3300m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2300m, AmountSaved: 72400m),
                        new("Vacation Fund", MonthlyContribution: 900m, AmountSaved: 20800m),
                        new("Home Repair", MonthlyContribution: 700m, AmountSaved: 24800m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 18000m, MinPayment: 800m),
                        new("Car Loan", Balance: 96000m)
                    ]
                },
                BudgetMonthCarryOverModes.None),
            new(
                "2026-04",
                BudgetTimelineScenarioData.Empty with
                {
                    ExpenseAmountOverrides =
                    [
                        new("Groceries", 6800m),
                        new("Utilities", 2300m)
                    ],
                    CreatedExpenses =
                    [
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Spring Travel", 7000m),
                        new(BudgetTimelineBaselineData.FixedExpenseCategoryId, "Garden Supplies", 2200m)
                    ],
                    SideHustleAmountOverrides =
                    [
                        new("Freelance", 3000m)
                    ],
                    CreatedDebts =
                    [
                        new("Bike Financing",
                            Type: "installment",
                            Balance: 2400m,
                            Apr: 0m,
                            MonthlyFee: 0m,
                            MinPayment: null,
                            TermMonths: 12)
                    ],
                    SavingsMonthlyOverride = 3000m,
                    SavingsGoalAdjustments =
                    [
                        new("Emergency Fund", MonthlyContribution: 2200m, AmountSaved: 74600m),
                        new("Vacation Fund", MonthlyContribution: 1000m, AmountSaved: 21800m),
                        new("Home Repair", MonthlyContribution: 800m, AmountSaved: 25600m)
                    ],
                    DebtAdjustments =
                    [
                        new("Credit Card", Balance: 17250m, MinPayment: 750m),
                        new("Car Loan", Balance: 93000m)
                    ]
                },
                BudgetMonthCarryOverModes.Full,
                TargetFinalBalance: LocalDevApril2026OpenFinalBalance)
        };

        return new BudgetTimelineProfile(
            Name: "local-dev-year-history",
            Baseline: baseline,
            Oldest: BudgetTimelineScenarioData.Empty,
            Middle: BudgetTimelineScenarioData.Empty,
            Open: BudgetTimelineScenarioData.Empty,
            PostCloseInvariantsAsync: VerifyLocalDevYearHistoryInvariantsAsync,
            TimelineMonths: timeline);
    }

    private static async Task VerifyLocalDevYearHistoryInvariantsAsync(
        BudgetTimelineSeedInvariantContext ctx)
    {
        var monthCount = await ctx.CountBudgetMonthsAsync();
        if (monthCount != 13)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed: month count was {monthCount}, expected 13.");
        }

        var skippedStatus = await ctx.GetBudgetMonthStatusAsync("2025-09");
        if (skippedStatus != BudgetMonthStatuses.Skipped)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for 2025-09: status was '{skippedStatus}', expected '{BudgetMonthStatuses.Skipped}'.");
        }

        var openStatus = await ctx.GetBudgetMonthStatusAsync("2026-04");
        if (openStatus != BudgetMonthStatuses.Open)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for 2026-04: status was '{openStatus}', expected '{BudgetMonthStatuses.Open}'.");
        }

        var juneCarryOver = await ctx.GetCarryOverOutcomeAmountAsync("2025-06");
        if (juneCarryOver != LocalDevJune2025FinalBalance)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for 2025-06: carry-over outcome was {juneCarryOver}, expected {LocalDevJune2025FinalBalance}.");
        }

        var mayCarryOver = await ctx.GetCarryOverOutcomeAmountAsync("2025-05");
        if (mayCarryOver != 0m)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for 2025-05: carry-over outcome was {mayCarryOver}, expected 0 for a no-carry-over month.");
        }

        AssertSnapshotTotals(
            scenarioName: "Local dev year-history",
            yearMonth: "2025-04",
            actual: await ctx.GetSnapshotTotalsAsync("2025-04"),
            expected: new BudgetTimelineSnapshotTotals(
                LocalDevApril2025Income,
                LocalDevApril2025Expenses,
                LocalDevApril2025Savings,
                LocalDevApril2025DebtPayments,
                LocalDevApril2025FinalBalance));

        AssertSnapshotTotals(
            scenarioName: "Local dev year-history",
            yearMonth: "2025-06",
            actual: await ctx.GetSnapshotTotalsAsync("2025-06"),
            expected: new BudgetTimelineSnapshotTotals(
                LocalDevJune2025Income,
                LocalDevJune2025Expenses,
                LocalDevJune2025Savings,
                LocalDevJune2025DebtPayments,
                LocalDevJune2025FinalBalance));

        AssertSnapshotTotals(
            scenarioName: "Local dev year-history",
            yearMonth: "2025-12",
            actual: await ctx.GetSnapshotTotalsAsync("2025-12"),
            expected: new BudgetTimelineSnapshotTotals(
                LocalDevDecember2025Income,
                LocalDevDecember2025Expenses,
                LocalDevDecember2025Savings,
                LocalDevDecember2025DebtPayments,
                LocalDevDecember2025FinalBalance));

        AssertSnapshotTotals(
            scenarioName: "Local dev year-history",
            yearMonth: "2026-03",
            actual: await ctx.GetSnapshotTotalsAsync("2026-03"),
            expected: new BudgetTimelineSnapshotTotals(
                LocalDevMarch2026Income,
                LocalDevMarch2026Expenses,
                LocalDevMarch2026Savings,
                LocalDevMarch2026DebtPayments,
                LocalDevMarch2026FinalBalance));

        var aprilOpenTotals = await ctx.GetComputedTotalsAsync("2026-04");
        if (aprilOpenTotals.FinalBalanceMonthly != LocalDevApril2026OpenFinalBalance)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for open 2026-04: computed final balance was {aprilOpenTotals.FinalBalanceMonthly}, expected {LocalDevApril2026OpenFinalBalance}.");
        }

        var activeSubscriptionTotal = await ctx.SumActiveSubscriptionAmountAsync("2025-12");
        if (activeSubscriptionTotal != LocalDevDecember2025ActiveSubscriptionTotal)
        {
            throw new InvalidOperationException(
                $"Local dev year-history seed invariant failed for 2025-12: active subscription total was {activeSubscriptionTotal}, expected {LocalDevDecember2025ActiveSubscriptionTotal} with cancelled subscriptions excluded.");
        }
    }
}
