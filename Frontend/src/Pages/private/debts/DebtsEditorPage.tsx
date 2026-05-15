import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import BudgetEditorWorkspaceBar from "@/components/molecules/forms/budgetEditor/BudgetEditorWorkspaceBar";
import {
  useBudgetMonthDebts,
  usePatchBudgetMonthDebt,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthDebtEditorRowDto,
  DebtEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DebtLedgerSection from "./components/DebtLedgerSection";
import DebtPlannedPaymentModal from "./components/DebtPlannedPaymentModal";

export default function DebtsEditorPage() {
  const locale = useAppLocale();
  const toast = useToast();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);
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

  const debtsQuery = useBudgetMonthDebts(
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
  const patchMutation = usePatchBudgetMonthDebt(mutationYearMonth);

  const [modalRow, setModalRow] =
    useState<BudgetMonthDebtEditorRowDto | null>(null);

  const openMonth = monthsStatusQuery.data?.months.find(
    (month) => month.yearMonth === editableYearMonth,
  );
  const readOnly = openMonth ? !canEditMonth(true, openMonth.status) : true;
  const rows = (debtsQuery.data ?? []).filter(
    (row) => !row.isDeleted && row.status !== "closed",
  );
  const total = rows.reduce((sum, row) => sum + row.monthlyPayment, 0);
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? 0;
  const expenseTotal = dashboardAggregate?.summary.totalExpenditure ?? 0;
  const remainingTotal =
    dashboardAggregate?.summary.remainingToSpend ?? incomeTotal - expenseTotal;
  const debtsTotal = dashboardAggregate?.summary.totalDebtPayments ?? total;

  const handleSubmit = async (values: {
    monthlyPayment: number;
    scope: DebtEditScope;
  }) => {
    if (!modalRow) return;
    const requestedScope = values.scope;
    const scope = modalRow.canUpdateDefault ? requestedScope : "currentMonthOnly";

    try {
      await patchMutation.mutateAsync({
        monthDebtId: modalRow.id,
        payload: {
          monthlyPayment: values.monthlyPayment,
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
    return <EditorState text={t("loadingDebts")} />;
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
                label: t("debts"),
                amount: debtsTotal,
              },
              {
                prefix: "=",
                label: t("remaining"),
                amount: remainingTotal,
                tone: remainingTotal < 0 ? "danger" : "accent",
              },
            ]}
          />

          <div className="rounded-2xl border border-eb-stroke/16 bg-eb-surface p-3 text-xs text-eb-text/55">
            {t("plannedNote")}
          </div>

          <div className="space-y-4">
            {debtsQuery.isLoading || dashboardMonthQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadingDebts")}
              </div>
            ) : debtsQuery.isError ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadEditorError")}
              </div>
            ) : (
              <DebtLedgerSection
                rows={rows}
                total={total}
                readOnly={readOnly}
                onEdit={(row) => setModalRow(row)}
              />
            )}
          </div>
        </div>
      </BudgetEditorPageShell>

      <DebtPlannedPaymentModal
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
