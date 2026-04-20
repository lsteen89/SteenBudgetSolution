import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { getEffectiveGoalMonthlyContribution } from "@/utils/budget/financialCalculations";
import { formatShortDate } from "@/utils/dates/parseIsoDateLocal";
import {
  mapPreviewIncome,
  type PreviewIncomeVm,
} from "@/utils/wizardPreview/mapPreviewIncome";

type GoalVm = {
  id: string;
  title: string;
  monthlyContribution: number;
  isFavorite: boolean;
  targetAmount?: number;
  amountSaved?: number;
  targetDateLabel?: string;
};

export type WizardSavingsConfirmPreview = PreviewIncomeVm & {
  monthlySavingsHabit: number;
  totalGoalSavingsMonthly: number;
  totalSavingsMonthly: number;
  goals: GoalVm[];
  disposableAfterExpensesMonthly: number;
  disposableAfterExpensesAndSavingsMonthly: number;
};

const num = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

export function mapFinalizationPreviewToSavingsConfirm(
  preview: BudgetDashboardDto,
  locale: AppLocale,
): WizardSavingsConfirmPreview {
  const income = mapPreviewIncome(preview);
  const s = preview.savings;

  const monthlySavingsHabit = num(s?.monthlySavings);

  const goals = (s?.goals ?? [])
    .map((g) => {
      const title = (g.name ?? "").trim() || "Namnlöst mål";
      const targetDateLabel = g.targetDate
        ? formatShortDate(g.targetDate, locale)
        : undefined;

      const monthlyContribution = getEffectiveGoalMonthlyContribution({
        monthlyContribution: g.monthlyContribution,
        targetAmount: g.targetAmount,
        amountSaved: g.amountSaved,
        targetDate: g.targetDate,
      });

      return {
        id: g.id,
        title,
        monthlyContribution,
        isFavorite: Boolean(g.isFavorite),
        targetAmount: g.targetAmount ?? undefined,
        amountSaved: g.amountSaved ?? undefined,
        targetDateLabel,
      };
    })
    .filter(
      (g) =>
        g.monthlyContribution !== 0 ||
        g.targetAmount ||
        g.amountSaved ||
        g.targetDateLabel,
    )
    .sort(
      (a, b) =>
        (b.monthlyContribution ?? 0) - (a.monthlyContribution ?? 0) ||
        a.title.localeCompare(b.title),
    );

  const computedGoalSavingsMonthly = goals.reduce(
    (sum, g) => sum + num(g.monthlyContribution),
    0,
  );

  const backendGoalSavingsMonthly = num(s?.totalGoalSavingsMonthly);
  const totalGoalSavingsMonthly =
    backendGoalSavingsMonthly > 0
      ? backendGoalSavingsMonthly
      : computedGoalSavingsMonthly;

  const backendTotalSavingsMonthly = num(s?.totalSavingsMonthly);
  const computedTotalSavingsMonthly =
    monthlySavingsHabit + totalGoalSavingsMonthly;

  const totalSavingsMonthly =
    backendTotalSavingsMonthly > 0
      ? backendTotalSavingsMonthly
      : computedTotalSavingsMonthly;

  return {
    ...income,
    monthlySavingsHabit,
    totalGoalSavingsMonthly,
    totalSavingsMonthly,
    goals,
    disposableAfterExpensesMonthly: num(
      preview.disposableAfterExpensesWithCarryMonthly,
    ),
    disposableAfterExpensesAndSavingsMonthly: num(
      preview.disposableAfterExpensesAndSavingsWithCarryMonthly,
    ),
  };
}
