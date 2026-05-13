import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import BudgetEditorWorkspaceBar from "@/components/molecules/forms/budgetEditor/BudgetEditorWorkspaceBar";
import {
  useBudgetMonthSavingsGoals,
  usePatchBudgetMonthSavingsGoal,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthSavingsGoalEditorRowDto,
  SavingsGoalEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import SavingsGoalContributionModal from "./components/SavingsGoalContributionModal";
import SavingsGoalLedgerSection from "./components/SavingsGoalLedgerSection";

export default function SavingsEditorPage() {
  const locale = useAppLocale();
  const toast = useToast();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const monthsStatusQuery = useBudgetMonthsStatusQuery();

  const editableYearMonth = useMemo(() => {
    const status = monthsStatusQuery.data;
    if (!status) return null;
    return (
      status.openMonthYearMonth ??
      status.months.find((month) => month.status === "open")?.yearMonth ??
      null
    );
  }, [monthsStatusQuery.data]);

  const savingsQuery = useBudgetMonthSavingsGoals(
    editableYearMonth ?? undefined,
    !!editableYearMonth,
  );
  const dashboardMonthQuery = useBudgetDashboardMonthQuery(editableYearMonth, {
    enabled: !!editableYearMonth,
  });
  const dashboardAggregate = useMemo(() => {
    if (!dashboardMonthQuery.data) return null;
    return buildDashboardSummaryAggregate(
      dashboardMonthQuery.data,
      locale as AppLocale,
    );
  }, [dashboardMonthQuery.data, locale]);

  const mutationYearMonth = editableYearMonth ?? "";
  const patchMutation = usePatchBudgetMonthSavingsGoal(mutationYearMonth);

  const [modalRow, setModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);

  const openMonth = monthsStatusQuery.data?.months.find(
    (month) => month.yearMonth === editableYearMonth,
  );
  const readOnly = openMonth ? !canEditMonth(true, openMonth.status) : true;
  const rows = (savingsQuery.data ?? []).filter((row) => !row.isDeleted);
  const total = rows.reduce((sum, row) => sum + row.monthlyContribution, 0);
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? 0;
  const expenseTotal = dashboardAggregate?.summary.totalExpenditure ?? 0;
  const remainingTotal =
    dashboardAggregate?.summary.remainingToSpend ?? incomeTotal - expenseTotal;
  const savingsTotal = dashboardAggregate?.summary.totalSavings ?? total;

  const handleSubmit = async (values: {
    monthlyContribution: number;
    scope: SavingsGoalEditScope;
  }) => {
    if (!modalRow) return;
    const requestedScope = values.scope;
    const scope = modalRow.canUpdateDefault ? requestedScope : "currentMonthOnly";

    try {
      await patchMutation.mutateAsync({
        monthSavingsGoalId: modalRow.id,
        payload: {
          monthlyContribution: values.monthlyContribution,
          scope,
        },
      });
      toast.success(t("itemUpdated"));
      setModalRow(null);
    } catch {
      toast.error(t("itemUpdateError"));
    }
  };

  if (monthsStatusQuery.isLoading) {
    return <EditorState text={t("loadingSavings")} />;
  }

  if (!editableYearMonth) {
    return <EditorState text={t("noOpenMonth")} />;
  }

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          <BudgetEditorWorkspaceBar
            eyebrow={t("eyebrow")}
            title={t("titleWithMonth").replace("{yearMonthLabel}", periodLabel)}
            description={t("description").replace(
              "{yearMonthLabel}",
              periodLabel,
            )}
            readOnlyBadge={t("readOnlyBadge")}
            periodLabel={periodLabel}
            periodCaption={t("period")}
            readOnly={readOnly}
            metrics={[
              {
                label: t("income"),
                amount: incomeTotal,
              },
              {
                prefix: "−",
                label: t("expenses"),
                amount: expenseTotal,
              },
              {
                prefix: "−",
                label: t("savings"),
                amount: savingsTotal,
              },
              {
                prefix: "=",
                label: t("remaining"),
                amount: remainingTotal,
                tone: remainingTotal < 0 ? "danger" : "accent",
              },
            ]}
          />

          <div className="space-y-4">
            {savingsQuery.isLoading || dashboardMonthQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadingSavings")}
              </div>
            ) : savingsQuery.isError ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadEditorError")}
              </div>
            ) : (
              <SavingsGoalLedgerSection
                rows={rows}
                total={total}
                readOnly={readOnly}
                onEdit={(row) => setModalRow(row)}
              />
            )}
          </div>
        </div>
      </BudgetEditorPageShell>

      <SavingsGoalContributionModal
        open={!!modalRow}
        row={modalRow}
        monthLabel={periodLabel}
        isSaving={patchMutation.isPending}
        onClose={() => {
          if (patchMutation.isPending) return;
          setModalRow(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}

function EditorState({ text }: { text: string }) {
  return (
    <BudgetEditorPageShell>
      <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface p-6 text-sm text-eb-text/60">
        {text}
      </div>
    </BudgetEditorPageShell>
  );
}
