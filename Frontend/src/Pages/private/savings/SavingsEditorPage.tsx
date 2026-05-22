import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import {
  useAddBudgetMonthSavingsMethod,
  useBudgetMonthSavingsGoals,
  useBudgetMonthSavingsMethods,
  useBudgetMonthSavingsOldGoals,
  useCancelSavingsGoalMutation,
  useCompleteSavingsGoalMutation,
  useCreateBudgetMonthSavingsGoal,
  usePatchBudgetMonthSavingsGoal,
  useRemoveBudgetMonthSavingsMethod,
  useRemoveSavingsGoalMutation,
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
import { useEffect, useMemo, useState } from "react";
import SavingsBaseHabitDialog, {
  type SavingsBaseHabitSavePayload,
} from "./components/SavingsBaseHabitDialog";
import SavingsBaseHabitRow from "./components/SavingsBaseHabitRow";
import SavingsForecastRow from "./components/SavingsForecastRow";
import SavingsGoalCardsList from "./components/SavingsGoalCardsList";
import type { SavingsGoalLifecycleAction } from "./components/SavingsGoalLifecycleConfirmDialog";
import SavingsGoalContributionModal from "./components/SavingsGoalContributionModal";
import SavingsGoalLifecycleConfirmDialog from "./components/SavingsGoalLifecycleConfirmDialog";
import SavingsMethodsEditor from "./components/SavingsMethodsEditor";
import SavingsMethodsStrip from "./components/SavingsMethodsStrip";
import SavingsOldGoalsSection from "./components/SavingsOldGoalsSection";
import SavingsPlanBalanceStrip from "./components/SavingsPlanBalanceStrip";
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
  const oldGoalsQuery = useBudgetMonthSavingsOldGoals(
    editableYearMonth ?? undefined,
    !!editableYearMonth,
  );
  const methodsQuery = useBudgetMonthSavingsMethods(
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
  const createMutation = useCreateBudgetMonthSavingsGoal(mutationYearMonth);
  const completeMutation = useCompleteSavingsGoalMutation(mutationYearMonth);
  const cancelMutation = useCancelSavingsGoalMutation(mutationYearMonth);
  const removeMutation = useRemoveSavingsGoalMutation(mutationYearMonth);
  const addMethodMutation = useAddBudgetMonthSavingsMethod(mutationYearMonth);
  const removeMethodMutation = useRemoveBudgetMonthSavingsMethod(mutationYearMonth);

  const [modalRow, setModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [lifecycleState, setLifecycleState] = useState<{
    action: SavingsGoalLifecycleAction;
    row: BudgetMonthSavingsGoalEditorRowDto;
  } | null>(null);
  const [methodsEditorOpen, setMethodsEditorOpen] = useState(false);
  const [methodsEditorError, setMethodsEditorError] = useState<string | null>(
    null,
  );
  const [methodsRemovingId, setMethodsRemovingId] = useState<string | null>(
    null,
  );
  const [baseHabitDialogOpen, setBaseHabitDialogOpen] = useState(false);
  // Placeholder: no Savings.MonthlySavings editor endpoint exists yet, so an
  // edit is held in session-local state until the savings module is wired to
  // the backend. Reset whenever the editable month changes.
  const [baseMonthlyOverride, setBaseMonthlyOverride] = useState<number | null>(
    null,
  );

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

  const baseMonthlyFromDashboard =
    dashboardAggregate?.summary.habitSavings ?? 0;
  const baseMonthly = baseMonthlyOverride ?? baseMonthlyFromDashboard;

  useEffect(() => {
    setBaseMonthlyOverride(null);
  }, [editableYearMonth]);

  const handleSaveBaseHabit = (payload: SavingsBaseHabitSavePayload) => {
    // No backend endpoint exists for base monthly savings yet. Keep the edit
    // session-local and log the intended payload so the wiring target — scope
    // included — is explicit for the future backend slice.
    console.info("[savings-mvp] update Savings.MonthlySavings", payload);
    setBaseMonthlyOverride(payload.amountMonthly);
    setBaseHabitDialogOpen(false);
    toast.success(t("habitDialogToastSuccess"));
  };

  const handleOpenDraft = () => {
    if (readOnly) return;
    setDraftError(null);
    setDraftOpen(true);
  };

  const handleCancelDraft = () => {
    if (createMutation.isPending) return;
    setDraftError(null);
    setDraftOpen(false);
  };

  const handleSubmitDraft = async (payload: {
    name: string;
    targetAmount: number;
    targetDate: string;
    amountSaved: number | null;
    monthlyContribution: number;
  }) => {
    setDraftError(null);
    try {
      await createMutation.mutateAsync({
        name: payload.name,
        targetAmount: payload.targetAmount,
        targetDate: payload.targetDate,
        amountSaved: payload.amountSaved,
        monthlyContribution: payload.monthlyContribution,
      });
      setDraftOpen(false);
      toast.success(t("draftToastSuccess"));
    } catch {
      setDraftError(t("draftSaveError"));
    }
  };

  const handleRequestLifecycle = (action: SavingsGoalLifecycleAction) => {
    if (!modalRow) return;
    if (readOnly) return;
    if (modalRow.isDeleted || modalRow.status !== "active") return;
    setLifecycleState({ action, row: modalRow });
  };

  const isLifecycleWorking =
    completeMutation.isPending ||
    cancelMutation.isPending ||
    removeMutation.isPending;

  const closeLifecycleDialog = () => {
    if (isLifecycleWorking) return;
    setLifecycleState(null);
  };

  const handleConfirmLifecycle = async () => {
    if (!lifecycleState) return;
    const { action, row } = lifecycleState;
    try {
      if (action === "complete") {
        await completeMutation.mutateAsync(row.id);
        toast.success(t("lifecycleToastCompleted"));
      } else if (action === "cancel") {
        await cancelMutation.mutateAsync(row.id);
        toast.success(t("lifecycleToastCancelled"));
      } else {
        await removeMutation.mutateAsync(row.id);
        toast.success(t("lifecycleToastRemoved"));
      }
      setLifecycleState(null);
      setModalRow(null);
    } catch {
      toast.error(t("lifecycleToastError"));
    }
  };

  const handleSubmit = async (values: {
    monthlyContribution: number;
    targetDate?: string;
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
          // The modal already gates the date by scope; we forward exactly
          // what it produced. Undefined means "leave the goal plan date
          // untouched". The BE applier treats a null/absent date the same.
          targetDate: values.targetDate,
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
            baseMonthly={baseMonthly}
            readOnly={readOnly}
          />

          <SavingsMethodsStrip
            methods={methodsQuery.data}
            readOnly={readOnly}
            onEdit={() => {
              setMethodsEditorError(null);
              setMethodsEditorOpen(true);
            }}
          />

          <SavingsBaseHabitRow
            baseMonthly={baseMonthly}
            readOnly={readOnly}
            onEdit={() => setBaseHabitDialogOpen(true)}
          />

          {dashboardAggregate ? (
            <SavingsPlanBalanceStrip
              currencyCode={dashboardAggregate.summary.currency}
              locale={locale as AppLocale}
              incomeMonthly={dashboardAggregate.summary.totalIncome}
              carryOverMonthly={
                dashboardAggregate.summary.incomingCarryOverAmount
              }
              expensesMonthly={dashboardAggregate.summary.totalExpenditure}
              baseSavingsMonthly={baseMonthly}
              goalSavingsMonthly={heroAggregate.totalMonthly}
              debtPaymentsMonthly={dashboardAggregate.summary.totalDebtPayments}
            />
          ) : null}

          {isLoadingContent ? (
            <div className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60">
              {t("loadingSavings")}
            </div>
          ) : savingsQuery.isError ? (
            <div className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60">
              {t("loadEditorError")}
            </div>
          ) : (
            <>
              <SavingsGoalCardsList
                rows={rows}
                readOnly={readOnly}
                referenceDate={referenceDate}
                showPlannedMarkerLegend={heroAggregate.hasPlannedMarker}
                onEdit={(row) => setModalRow(row)}
                draftOpen={draftOpen && !readOnly}
                draftSubmitting={createMutation.isPending}
                draftError={draftError}
                onOpenDraft={handleOpenDraft}
                onCancelDraft={handleCancelDraft}
                onSubmitDraft={handleSubmitDraft}
              />
              <SavingsForecastRow
                referenceDate={referenceDate}
                totalSaved={heroAggregate.totalSaved}
                monthlyContribution={heroAggregate.totalMonthly}
              />
              <SavingsOldGoalsSection rows={oldGoalsQuery.data ?? []} />
            </>
          )}
        </div>
      </BudgetEditorPageShell>

      <SavingsGoalContributionModal
        open={!!modalRow}
        row={modalRow}
        monthLabel={periodLabel}
        remainingBudgetRoom={dashboardAggregate?.summary.remainingToSpend ?? null}
        isSaving={patchMutation.isPending}
        onClose={() => {
          if (patchMutation.isPending) return;
          setModalRow(null);
        }}
        onSubmit={handleSubmit}
        onLifecycleAction={readOnly ? undefined : handleRequestLifecycle}
      />

      <SavingsGoalLifecycleConfirmDialog
        open={!!lifecycleState}
        action={lifecycleState?.action ?? null}
        goalName={lifecycleState?.row.name ?? ""}
        isPlanLinked={!(lifecycleState?.row.isMonthOnly ?? true)}
        isWorking={isLifecycleWorking}
        onClose={closeLifecycleDialog}
        onConfirm={handleConfirmLifecycle}
      />

      <SavingsMethodsEditor
        open={methodsEditorOpen && !readOnly}
        methods={methodsQuery.data}
        isAdding={addMethodMutation.isPending}
        removingId={methodsRemovingId}
        errorMessage={methodsEditorError}
        onAdd={async (payload) => {
          setMethodsEditorError(null);
          try {
            await addMethodMutation.mutateAsync(payload);
          } catch (err) {
            setMethodsEditorError(t("savingsMethodsAddError"));
            throw err;
          }
        }}
        onRemove={async (savingsMethodId, label) => {
          setMethodsEditorError(null);
          setMethodsRemovingId(savingsMethodId);
          try {
            await removeMethodMutation.mutateAsync(savingsMethodId);
            toast.success(
              t("savingsMethodsRemovedToast").replace("{label}", label),
            );
          } catch (err) {
            setMethodsEditorError(t("savingsMethodsRemoveError"));
            throw err;
          } finally {
            setMethodsRemovingId(null);
          }
        }}
        onClose={() => {
          if (addMethodMutation.isPending || methodsRemovingId) return;
          setMethodsEditorOpen(false);
        }}
      />

      <SavingsBaseHabitDialog
        open={baseHabitDialogOpen && !readOnly}
        baseMonthly={baseMonthly}
        monthLabel={periodLabel}
        onClose={() => setBaseHabitDialogOpen(false)}
        onSave={handleSaveBaseHabit}
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
