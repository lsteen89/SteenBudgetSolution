import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { formatShortDate } from "@/utils/dates/parseIsoDateLocal";
import {
  mapPreviewIncome,
  type PreviewIncomeVm,
} from "@/utils/wizardPreview/mapPreviewIncome";

type GoalVm = {
  id: string;
  title: string;
  monthlyContribution: number;
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

  const goals = (s?.goals ?? [])
    .map((g) => {
      const title = (g.name ?? "").trim() || "Namnlöst mål";
      const targetDateLabel = g.targetDate
        ? formatShortDate(g.targetDate, locale)
        : undefined;

      return {
        id: g.id,
        title,
        monthlyContribution: num(g.monthlyContribution),
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

  return {
    ...income,
    monthlySavingsHabit: num(s?.monthlySavings),
    totalGoalSavingsMonthly: num(s?.totalGoalSavingsMonthly),
    totalSavingsMonthly: num(s?.totalSavingsMonthly),
    goals,
    disposableAfterExpensesMonthly: num(
      preview.disposableAfterExpensesWithCarryMonthly,
    ),
    disposableAfterExpensesAndSavingsMonthly: num(
      preview.disposableAfterExpensesAndSavingsWithCarryMonthly,
    ),
  };
}
