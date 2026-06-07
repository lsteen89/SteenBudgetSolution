import {
  Banknote,
  CreditCard,
  PiggyBank,
  ReceiptText,
} from "lucide-react";
import React from "react";

import type {
  BreakdownItem,
  DashboardBreakdown,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import { pillarWorkbenchDict } from "@/utils/i18n/pages/private/dashboard/openMonth/PillarWorkbench.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import PillarWorkbenchCard from "./PillarWorkbenchCard";

/**
 * OpenMonthPillarWorkbench (P3)
 *
 * Replaces the legacy `OpenMonthPillarsGrid` + `OpenMonthPillarCard` pair with
 * a denser 2x2 (single-column on mobile) workbench. Each pillar surfaces:
 *
 *  - Income: salary / side / household split (from `breakdown.incomeItems`).
 *  - Expenses: top categories + subscription and recurring pressure chips.
 *  - Savings: base saving, goal contributions, goal progress.
 *  - Debts: monthly payment, total debt balance, debt count + strategy chip.
 *
 * All figures come from the single `GET /api/budgets/dashboard` read that the
 * dashboard already pulls. No editor endpoints are fetched on render — quick
 * adjust and "edit all" handlers are passed in from the dashboard page; quick
 * adjust opens an existing lazy drawer panel, "edit all" navigates to the
 * existing full editor route.
 *
 * Read-only / closed / skipped months bypass this component upstream
 * (`DashboardContent` selects a different branch), so it always assumes the
 * month is open and editable.
 */
export interface OpenMonthPillarWorkbenchProps {
  summary: DashboardSummary;
  breakdown: DashboardBreakdown;
  dashboardMonth: BudgetDashboardMonthDto;
  onOpenIncomeEditor: () => void;
  onOpenFullIncomeEditor: () => void;
  onOpenPeriodEditor: () => void;
  onOpenFullExpenseEditor: () => void;
  onOpenSavingsEditor: () => void;
  onOpenFullSavingsEditor: () => void;
  onOpenDebtsEditor: () => void;
  onOpenFullDebtsEditor: () => void;
}

type IncomeGroupTotals = {
  salary: number;
  side: number;
  household: number;
  activeSources: number;
};

const EPSILON = 0.005;

function aggregateIncomeGroups(items: BreakdownItem[]): IncomeGroupTotals {
  let salary = 0;
  let side = 0;
  let household = 0;
  let activeSources = 0;

  for (const item of items) {
    if (Math.abs(item.amount) < EPSILON) continue;
    activeSources += 1;

    if (item.key.includes(":salary")) salary += item.amount;
    else if (item.key.includes(":side:")) side += item.amount;
    else if (item.key.includes(":member:")) household += item.amount;
  }

  return { salary, side, household, activeSources };
}

type StrategyKey = "avalanche" | "snowball" | "noAction" | "unknown" | null;

function normalizeStrategy(raw: string | null | undefined): StrategyKey {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "avalanche") return "avalanche";
  if (v === "snowball") return "snowball";
  if (v === "noaction" || v === "none") return "noAction";
  if (v === "unknown") return "unknown";
  return null;
}

/** Compact metric row: label on the left, planned value on the right. */
const SignalRow: React.FC<{
  label: string;
  value: string;
  testId?: string;
  emphasised?: boolean;
}> = ({ label, value, testId, emphasised = false }) => (
  <div
    data-testid={testId}
    className="flex items-baseline justify-between gap-3"
  >
    <span className="truncate text-xs font-medium text-eb-text/65">{label}</span>
    <span
      className={cn(
        "shrink-0 text-sm font-semibold tabular-nums text-eb-text",
        emphasised && "text-eb-text",
      )}
    >
      {value}
    </span>
  </div>
);

/** Subtle chip for secondary planning context (subscriptions, strategy). */
const SignalChip: React.FC<{
  label: string;
  value: string;
  testId?: string;
}> = ({ label, value, testId }) => (
  <div
    data-testid={testId}
    className="flex items-baseline justify-between gap-3 rounded-xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.28)] px-2.5 py-1.5"
  >
    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
      {label}
    </span>
    <span className="shrink-0 text-xs font-semibold tabular-nums text-eb-text/85">
      {value}
    </span>
  </div>
);

/** Quiet empty state inside a pillar's signal area. */
const SignalEmpty: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-xs leading-5 text-eb-text/55">{label}</p>
);

const OpenMonthPillarWorkbench: React.FC<OpenMonthPillarWorkbenchProps> = ({
  summary,
  breakdown,
  dashboardMonth,
  onOpenIncomeEditor,
  onOpenFullIncomeEditor,
  onOpenPeriodEditor,
  onOpenFullExpenseEditor,
  onOpenSavingsEditor,
  onOpenFullSavingsEditor,
  onOpenDebtsEditor,
  onOpenFullDebtsEditor,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof pillarWorkbenchDict.sv>(key: K): string =>
    tDict(key, locale, pillarWorkbenchDict);
  const fmt = (amount: number) =>
    formatMoneyV2(amount, summary.currency, locale);

  // ----- Income --------------------------------------------------------
  const incomeGroups = React.useMemo(
    () => aggregateIncomeGroups(breakdown.incomeItems),
    [breakdown.incomeItems],
  );
  const incomeHasAny = summary.totalIncome >= EPSILON;
  const incomeSubtitle = !incomeHasAny
    ? t("incomeSubtitleNone")
    : (incomeGroups.activeSources === 1
        ? t("incomeSubtitleSources")
        : t("incomeSubtitleSourcesOther")
      ).replace("{count}", String(incomeGroups.activeSources));

  // ----- Expenses ------------------------------------------------------
  const topExpenseCategories = React.useMemo(() => {
    return [...breakdown.expenseCategoryItems]
      .filter((c) => Math.abs(c.amount) >= EPSILON)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [breakdown.expenseCategoryItems]);
  const expensesCategoryCount = breakdown.expenseCategoryItems.filter(
    (c) => Math.abs(c.amount) >= EPSILON,
  ).length;
  const expensesHasAny = summary.totalExpenditure >= EPSILON;
  const expensesSubtitle = !expensesHasAny
    ? t("expensesSubtitleNone")
    : (expensesCategoryCount === 1
        ? t("expensesSubtitleCategories")
        : t("expensesSubtitleCategoriesOther")
      ).replace("{count}", String(expensesCategoryCount));

  const hasSubscriptions =
    summary.subscriptionsCount > 0 && summary.subscriptionsTotal >= EPSILON;
  const recurringCount = summary.recurringExpenses.length;
  const recurringTotal = summary.recurringExpenses.reduce(
    (sum, item) => sum + item.amountMonthly,
    0,
  );
  const hasRecurring = recurringCount > 0 && recurringTotal >= EPSILON;

  // ----- Savings -------------------------------------------------------
  const goals = dashboardMonth.liveDashboard?.savings?.goals ?? [];
  const activeGoalsCount = goals.filter((g) => {
    const target = g.targetAmount ?? 0;
    const saved = g.amountSaved ?? 0;
    return target > 0 || saved > 0 || (g.monthlyContribution ?? 0) > 0;
  }).length;
  const savingsHasAny = summary.totalSavings >= EPSILON;
  const goalsProgress = Math.max(0, Math.min(100, summary.goalsProgressPercent));
  const savingsSubtitle = !savingsHasAny
    ? t("savingsSubtitleNone")
    : activeGoalsCount === 0
      ? t("savingsSubtitleNoGoals")
      : t("savingsSubtitle").replace("{percent}", String(Math.round(goalsProgress)));

  // ----- Debts ---------------------------------------------------------
  const totalDebtBalance =
    dashboardMonth.liveDashboard?.debt?.totalDebtBalance ?? 0;
  const debtsList = dashboardMonth.liveDashboard?.debt?.debts ?? [];
  const debtsCount = debtsList.length;
  const debtsHasAny = summary.totalDebtPayments >= EPSILON || debtsCount > 0;
  const debtsSubtitle = !debtsHasAny
    ? t("debtsSubtitleNone")
    : (debtsCount === 1
        ? t("debtsSubtitleCount")
        : t("debtsSubtitleCountOther")
      ).replace("{count}", String(debtsCount));
  const strategyKey = normalizeStrategy(
    dashboardMonth.liveDashboard?.debt?.repaymentStrategy,
  );
  const strategyLabel: string | null =
    strategyKey === "avalanche"
      ? t("strategyAvalanche")
      : strategyKey === "snowball"
        ? t("strategySnowball")
        : strategyKey === "noAction"
          ? t("strategyNoAction")
          : strategyKey === "unknown"
            ? t("strategyUnknown")
            : null;

  return (
    <section
      data-testid="pillar-workbench"
      aria-labelledby="pillar-workbench-heading"
      className="space-y-3"
    >
      <header className="flex flex-col gap-1">
        <h2
          id="pillar-workbench-heading"
          className="text-sm font-bold text-eb-text"
        >
          {t("sectionEyebrow")}
        </h2>
        <p className="max-w-2xl text-xs leading-5 text-eb-text/55">
          {t("sectionHint")}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {/* ----- Income ----- */}
        <PillarWorkbenchCard
          testId="pillar-income"
          title={t("incomeTitle")}
          amount={fmt(summary.totalIncome)}
          amountAriaLabel={t("incomeAmountAria")}
          subtitle={incomeSubtitle}
          icon={<Banknote className="h-5 w-5" aria-hidden="true" />}
          quickAdjustLabel={t("actionQuickAdjustIncome")}
          onQuickAdjust={onOpenIncomeEditor}
          editLabel={t("actionEditIncome")}
          onEdit={onOpenFullIncomeEditor}
        >
          {incomeHasAny ? (
            <>
              {incomeGroups.salary >= EPSILON ? (
                <SignalRow
                  testId="pillar-income-salary"
                  label={t("signalSalary")}
                  value={fmt(incomeGroups.salary)}
                />
              ) : null}
              {incomeGroups.side >= EPSILON ? (
                <SignalRow
                  testId="pillar-income-side"
                  label={t("signalSide")}
                  value={fmt(incomeGroups.side)}
                />
              ) : null}
              {incomeGroups.household >= EPSILON ? (
                <SignalRow
                  testId="pillar-income-household"
                  label={t("signalHousehold")}
                  value={fmt(incomeGroups.household)}
                />
              ) : null}
            </>
          ) : (
            <SignalEmpty label={t("incomeSubtitleNone")} />
          )}
        </PillarWorkbenchCard>

        {/* ----- Expenses ----- */}
        <PillarWorkbenchCard
          testId="pillar-expenses"
          title={t("expensesTitle")}
          amount={fmt(summary.totalExpenditure)}
          amountAriaLabel={t("expensesAmountAria")}
          subtitle={expensesSubtitle}
          icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
          quickAdjustLabel={t("actionQuickAdjustExpenses")}
          onQuickAdjust={onOpenPeriodEditor}
          editLabel={t("actionEditExpenses")}
          onEdit={onOpenFullExpenseEditor}
        >
          {expensesHasAny ? (
            <>
              {topExpenseCategories.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
                    {t("signalTopCategories")}
                  </span>
                  {topExpenseCategories.map((cat) => (
                    <SignalRow
                      key={cat.key}
                      testId={`pillar-expenses-category-${cat.key}`}
                      label={cat.label}
                      value={fmt(cat.amount)}
                    />
                  ))}
                </div>
              ) : null}
              {hasSubscriptions ? (
                <SignalChip
                  testId="pillar-expenses-subscriptions"
                  label={t("signalSubscriptions")}
                  value={t("signalSubscriptionsValue")
                    .replace("{count}", String(summary.subscriptionsCount))
                    .replace("{monthly}", fmt(summary.subscriptionsTotal))
                    .replace("{annual}", fmt(summary.subscriptionsTotal * 12))}
                />
              ) : null}
              {hasRecurring ? (
                <SignalChip
                  testId="pillar-expenses-recurring"
                  label={t("signalRecurring")}
                  value={t("signalRecurringValue")
                    .replace("{count}", String(recurringCount))
                    .replace("{monthly}", fmt(recurringTotal))}
                />
              ) : null}
            </>
          ) : (
            <SignalEmpty label={t("expensesSubtitleNone")} />
          )}
        </PillarWorkbenchCard>

        {/* ----- Savings ----- */}
        <PillarWorkbenchCard
          testId="pillar-savings"
          title={t("savingsTitle")}
          amount={fmt(summary.totalSavings)}
          amountAriaLabel={t("savingsAmountAria")}
          subtitle={savingsSubtitle}
          icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
          quickAdjustLabel={t("actionQuickAdjustSavings")}
          onQuickAdjust={onOpenSavingsEditor}
          editLabel={t("actionEditSavings")}
          onEdit={onOpenFullSavingsEditor}
        >
          {savingsHasAny ? (
            <>
              {summary.habitSavings >= EPSILON ? (
                <SignalRow
                  testId="pillar-savings-habit"
                  label={t("signalMonthlySaving")}
                  value={fmt(summary.habitSavings)}
                />
              ) : null}
              {summary.goalSavings >= EPSILON ? (
                <SignalRow
                  testId="pillar-savings-goals"
                  label={t("signalGoalContributions")}
                  value={fmt(summary.goalSavings)}
                />
              ) : null}
              {activeGoalsCount > 0 ? (
                <div
                  data-testid="pillar-savings-progress"
                  className="mt-1 flex flex-col gap-1"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
                      {t("signalGoalsProgress")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-eb-text/85">
                      {(activeGoalsCount === 1
                        ? t("signalActiveGoals")
                        : t("signalActiveGoalsOther")
                      ).replace("{count}", String(activeGoalsCount))}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(goalsProgress)}
                    aria-label={t("signalGoalsProgressAria").replace(
                      "{percent}",
                      String(Math.round(goalsProgress)),
                    )}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-eb-stroke/25"
                  >
                    <div
                      className="h-full rounded-full bg-eb-accent transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${goalsProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <SignalEmpty label={t("savingsSubtitleNone")} />
          )}
        </PillarWorkbenchCard>

        {/* ----- Debts ----- */}
        <PillarWorkbenchCard
          testId="pillar-debts"
          title={t("debtsTitle")}
          amount={fmt(summary.totalDebtPayments)}
          amountAriaLabel={t("debtsAmountAria")}
          subtitle={debtsSubtitle}
          icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
          quickAdjustLabel={t("actionQuickAdjustDebts")}
          onQuickAdjust={onOpenDebtsEditor}
          editLabel={t("actionEditDebts")}
          onEdit={onOpenFullDebtsEditor}
        >
          {debtsHasAny ? (
            <>
              {summary.totalDebtPayments >= EPSILON ? (
                <SignalRow
                  testId="pillar-debts-monthly"
                  label={t("signalMonthlyPayment")}
                  value={fmt(summary.totalDebtPayments)}
                />
              ) : null}
              {totalDebtBalance >= EPSILON ? (
                <SignalRow
                  testId="pillar-debts-balance"
                  label={t("signalTotalBalance")}
                  value={fmt(totalDebtBalance)}
                />
              ) : null}
              {strategyLabel ? (
                <SignalChip
                  testId="pillar-debts-strategy"
                  label={t("signalStrategy")}
                  value={strategyLabel}
                />
              ) : null}
            </>
          ) : (
            <SignalEmpty label={t("debtsSubtitleNone")} />
          )}
        </PillarWorkbenchCard>
      </div>
    </section>
  );
};

export default OpenMonthPillarWorkbench;
