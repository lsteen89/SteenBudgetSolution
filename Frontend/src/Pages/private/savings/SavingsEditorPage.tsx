import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
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
import SavingsGoalCardsList from "./components/SavingsGoalCardsList";
import SavingsGoalContributionModal from "./components/SavingsGoalContributionModal";
import SavingsSoulHero from "./components/SavingsSoulHero";
import { aggregateSavingsHero, getMonthStartDate } from "./utils/savingsSoul";

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
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";

  const referenceDate = useMemo(
    () => getMonthStartDate(editableYearMonth ?? ""),
    [editableYearMonth],
  );
  const heroAggregate = useMemo(
    () => aggregateSavingsHero(rows, referenceDate),
    [rows, referenceDate],
  );

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

  const isLoadingContent =
    savingsQuery.isLoading || dashboardMonthQuery.isLoading;

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-5">
          <SavingsSoulHero
            periodLabel={periodLabel}
            aggregate={heroAggregate}
            readOnly={readOnly}
          />

          {isLoadingContent ? (
            <div className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60">
              {t("loadingSavings")}
            </div>
          ) : savingsQuery.isError ? (
            <div className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60">
              {t("loadEditorError")}
            </div>
          ) : (
            <SavingsGoalCardsList
              rows={rows}
              readOnly={readOnly}
              referenceDate={referenceDate}
              showPlannedMarkerLegend={heroAggregate.hasPlannedMarker}
              onEdit={(row) => setModalRow(row)}
            />
          )}
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
