import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import SelectedMonthBanner from "@/components/molecules/forms/budgetEditor/SelectedMonthBanner";
import { useEditorSelectedMonth } from "@/hooks/budget/editPeriod/useEditorSelectedMonth";
import {
  useAddBudgetMonthSavingsMethod,
  useBudgetMonthSavingsGoals,
  useBudgetMonthSavingsMethods,
  useBudgetMonthSavingsOldGoals,
  useCancelSavingsGoalMutation,
  useChangeBudgetMonthSavingsGoalTargetAmountMutation,
  useCompleteSavingsGoalMutation,
  useCreateBudgetMonthSavingsGoal,
  usePatchBudgetMonthBaseSavings,
  usePatchBudgetMonthSavingsGoal,
  useRemoveBudgetMonthSavingsMethod,
  useRemoveSavingsGoalMutation,
  useRenameBudgetMonthSavingsGoalMutation,
  useTransferBudgetMonthSavingsGoalMutation,
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
import SavingsGoalLifecycleConfirmDialog from "./components/SavingsGoalLifecycleConfirmDialog";
import SavingsGoalMonthlyModal from "./components/SavingsGoalMonthlyModal";
import SavingsGoalRenameModal, {
  type SavingsGoalRenameSavePayload,
} from "./components/SavingsGoalRenameModal";
import SavingsGoalTargetAmountModal, {
  type SavingsGoalTargetAmountSavePayload,
} from "./components/SavingsGoalTargetAmountModal";
import SavingsGoalTransferModal, {
  type SavingsGoalTransferSavePayload,
} from "./components/SavingsGoalTransferModal";
import SavingsGoalTargetDateModal, {
  type SavingsGoalTargetDateMode,
} from "./components/SavingsGoalTargetDateModal";
import SavingsMethodsEditor from "./components/SavingsMethodsEditor";
import SavingsMethodsStrip from "./components/SavingsMethodsStrip";
import SavingsOldGoalsSection from "./components/SavingsOldGoalsSection";
import SavingsPlanBalanceStrip from "./components/SavingsPlanBalanceStrip";
import SavingsSoulHero from "./components/SavingsSoulHero";
import { aggregateSavingsHero, getMonthStartDate } from "./utils/savingsSoul";
import { transferErrorMessage } from "./utils/transferErrorMessage";
import {
  renameErrorMessage,
  targetAmountErrorMessage,
} from "./utils/goalEditErrorMessage";
import { savingsGoalRenameModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalRenameModal.i18n";
import { savingsGoalTargetAmountModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalTargetAmountModal.i18n";

export default function SavingsEditorPage() {
  const locale = useAppLocale();
  const toast = useToast();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const monthsStatusQuery = useBudgetMonthsStatusQuery();

  // The month this page reads and writes: the open month by default, or the
  // explicit `?yearMonth=` selection (open/planned editable; closed/skipped
  // read-only; unknown selections refuse below instead of falling back).
  const selectedMonth = useEditorSelectedMonth();
  const editableYearMonth = selectedMonth.yearMonth;

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
  const baseSavingsMutation = usePatchBudgetMonthBaseSavings(mutationYearMonth);
  const transferMutation =
    useTransferBudgetMonthSavingsGoalMutation(mutationYearMonth);
  const renameMutation =
    useRenameBudgetMonthSavingsGoalMutation(mutationYearMonth);
  const targetAmountMutation =
    useChangeBudgetMonthSavingsGoalTargetAmountMutation(mutationYearMonth);

  const [monthlyModalRow, setMonthlyModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [targetDateModalRow, setTargetDateModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [transferModalRow, setTransferModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [renameModalRow, setRenameModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [targetAmountModalRow, setTargetAmountModalRow] =
    useState<BudgetMonthSavingsGoalEditorRowDto | null>(null);
  const [targetAmountError, setTargetAmountError] = useState<string | null>(
    null,
  );
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
  const [baseHabitError, setBaseHabitError] = useState<string | null>(null);

  const readOnly = !selectedMonth.isEditable;
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

  const baseMonthly = dashboardAggregate?.summary.habitSavings ?? 0;
  const baseIsMonthOnly =
    dashboardMonthQuery.data?.liveDashboard?.savings?.isMonthOnly ?? false;

  useEffect(() => {
    setBaseHabitError(null);
  }, [editableYearMonth]);

  const handleSaveBaseHabit = async (payload: SavingsBaseHabitSavePayload) => {
    setBaseHabitError(null);
    try {
      await baseSavingsMutation.mutateAsync({
        amountMonthly: payload.amountMonthly,
        scope: payload.scope,
      });
      setBaseHabitDialogOpen(false);
      toast.success(t("habitDialogToastSuccess"));
    } catch (err) {
      const message =
        (err as { message?: string } | null)?.message ?? t("habitDialogSaveError");
      setBaseHabitError(message);
    }
  };

  const handleCloseBaseHabitDialog = () => {
    if (baseSavingsMutation.isPending) return;
    setBaseHabitError(null);
    setBaseHabitDialogOpen(false);
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

  const handleRequestLifecycle = (
    action: SavingsGoalLifecycleAction,
    row: BudgetMonthSavingsGoalEditorRowDto,
  ) => {
    if (readOnly) return;
    if (row.isDeleted || row.status !== "active") return;
    setLifecycleState({ action, row });
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
      setMonthlyModalRow(null);
      setTargetDateModalRow(null);
    } catch {
      toast.error(t("lifecycleToastError"));
    }
  };

  const handleSubmitMonthly = async (values: {
    monthlyContribution: number;
    scope: SavingsGoalEditScope;
  }) => {
    if (!monthlyModalRow) return;
    const requestedScope = values.scope;
    const scope = monthlyModalRow.canUpdateDefault
      ? requestedScope
      : "currentMonthOnly";

    try {
      await patchMutation.mutateAsync({
        monthSavingsGoalId: monthlyModalRow.id,
        payload: {
          monthlyContribution: values.monthlyContribution,
          scope,
        },
      });
      toast.success(t("itemUpdated"));
      setMonthlyModalRow(null);
    } catch {
      toast.error(t("itemUpdateError"));
    }
  };

  const handleOpenTransfer = (row: BudgetMonthSavingsGoalEditorRowDto) => {
    if (readOnly) return;
    if (row.isDeleted || row.status !== "active") return;
    setTransferError(null);
    setTransferModalRow(row);
  };

  const handleCloseTransfer = () => {
    if (transferMutation.isPending) return;
    setTransferError(null);
    setTransferModalRow(null);
  };

  const handleSubmitTransfer = async (
    values: SavingsGoalTransferSavePayload,
  ) => {
    if (!transferModalRow) return;
    setTransferError(null);
    try {
      await transferMutation.mutateAsync({
        monthSavingsGoalId: transferModalRow.id,
        payload: {
          amount: values.amount,
          direction: values.direction,
          note: values.note,
        },
      });
      toast.success(
        values.direction === "deposit"
          ? t("transferToastDeposit")
          : t("transferToastWithdraw"),
      );
      setTransferModalRow(null);
    } catch (err) {
      const message = transferErrorMessage(err, t);
      setTransferError(message);
      toast.error(message);
    }
  };

  const handleSubmitTargetDate = async (values: {
    monthlyContribution: number;
    targetDate: string;
    mode: SavingsGoalTargetDateMode;
  }) => {
    if (!targetDateModalRow) return;
    if (!targetDateModalRow.canUpdateDefault) return;

    try {
      await patchMutation.mutateAsync({
        monthSavingsGoalId: targetDateModalRow.id,
        payload: {
          monthlyContribution: values.monthlyContribution,
          targetDate: values.targetDate,
          scope: "currentMonthAndBudgetPlan",
        },
      });
      toast.success(t("itemUpdated"));
      setTargetDateModalRow(null);
    } catch {
      toast.error(t("itemUpdateError"));
    }
  };

  const handleOpenRename = (row: BudgetMonthSavingsGoalEditorRowDto) => {
    if (readOnly) return;
    if (row.isDeleted || row.status !== "active") return;
    setRenameError(null);
    setRenameModalRow(row);
  };

  const handleCloseRename = () => {
    if (renameMutation.isPending) return;
    setRenameError(null);
    setRenameModalRow(null);
  };

  const handleSubmitRename = async (
    values: SavingsGoalRenameSavePayload,
  ) => {
    if (!renameModalRow) return;
    setRenameError(null);
    const tRename = <K extends keyof typeof savingsGoalRenameModalDict.sv>(
      key: K,
    ) => tDict(key, locale, savingsGoalRenameModalDict);
    try {
      await renameMutation.mutateAsync({
        monthSavingsGoalId: renameModalRow.id,
        payload: { name: values.name },
      });
      toast.success(tRename("toastSuccess"));
      setRenameModalRow(null);
    } catch (err) {
      const message = renameErrorMessage(err, tRename);
      setRenameError(message);
      toast.error(message);
    }
  };

  const handleOpenChangeTarget = (row: BudgetMonthSavingsGoalEditorRowDto) => {
    if (readOnly) return;
    if (row.isDeleted || row.status !== "active") return;
    setTargetAmountError(null);
    setTargetAmountModalRow(row);
  };

  const handleCloseChangeTarget = () => {
    if (targetAmountMutation.isPending) return;
    setTargetAmountError(null);
    setTargetAmountModalRow(null);
  };

  const handleSubmitChangeTarget = async (
    values: SavingsGoalTargetAmountSavePayload,
  ) => {
    if (!targetAmountModalRow) return;
    setTargetAmountError(null);
    const tTarget = <
      K extends keyof typeof savingsGoalTargetAmountModalDict.sv,
    >(
      key: K,
    ) => tDict(key, locale, savingsGoalTargetAmountModalDict);
    try {
      await targetAmountMutation.mutateAsync({
        monthSavingsGoalId: targetAmountModalRow.id,
        payload: { targetAmount: values.targetAmount },
      });
      toast.success(tTarget("toastSuccess"));
      setTargetAmountModalRow(null);
    } catch (err) {
      const message = targetAmountErrorMessage(err, tTarget);
      setTargetAmountError(message);
      toast.error(message);
    }
  };

  if (monthsStatusQuery.isLoading) {
    return <EditorState text={t("loadingSavings")} />;
  }

  // An explicit ?yearMonth= that is malformed or not a persisted month must
  // refuse clearly — silently editing the open month instead would mutate a
  // month the user never chose.
  if (selectedMonth.isInvalidSelection) {
    return <EditorState text={t("monthNotFound")} />;
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
          {selectedMonth.status && (
            <SelectedMonthBanner
              yearMonth={editableYearMonth}
              status={selectedMonth.status}
              isOffOpenMonth={selectedMonth.isOffOpenMonth}
            />
          )}
          {/*
           * Honesty gate: the hero's base amount, the methods strip, the base
           * habit row, and the balance strip all depend on the savings rows
           * AND the dashboard aggregate being real. Rendering them while
           * either query is loading or failed would fall back to `0 kr` base
           * savings and an empty goal list — for a selected planned month
           * that reads as "this month has no savings", which is fabricated.
           */}
          {isLoadingContent ? (
            <div
              data-testid="savings-editor-loading"
              className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60"
            >
              {t("loadingSavings")}
            </div>
          ) : savingsQuery.isError ||
            dashboardMonthQuery.isError ||
            !dashboardAggregate ? (
            <div
              data-testid="savings-editor-error"
              className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-6 text-sm text-eb-text/60"
            >
              {t("loadEditorError")}
            </div>
          ) : (
            <>
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
                onEdit={() => {
                  setBaseHabitError(null);
                  setBaseHabitDialogOpen(true);
                }}
              />

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

              <SavingsGoalCardsList
                rows={rows}
                readOnly={readOnly}
                referenceDate={referenceDate}
                showPlannedMarkerLegend={heroAggregate.hasPlannedMarker}
                onDeposit={handleOpenTransfer}
                onMonthly={(row) => setMonthlyModalRow(row)}
                onTargetDate={(row) => setTargetDateModalRow(row)}
                onRename={handleOpenRename}
                onChangeTarget={handleOpenChangeTarget}
                onArchive={(row) => handleRequestLifecycle("complete", row)}
                onRemove={(row) => handleRequestLifecycle("remove", row)}
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

      <SavingsGoalTransferModal
        open={!!transferModalRow}
        row={transferModalRow}
        monthLabel={periodLabel}
        methods={methodsQuery.data}
        isSaving={transferMutation.isPending}
        errorMessage={transferError}
        onClose={handleCloseTransfer}
        onSubmit={handleSubmitTransfer}
      />

      <SavingsGoalMonthlyModal
        open={!!monthlyModalRow}
        row={monthlyModalRow}
        monthLabel={periodLabel}
        remainingBudgetRoom={dashboardAggregate?.summary.remainingToSpend ?? null}
        isSaving={patchMutation.isPending}
        onClose={() => {
          if (patchMutation.isPending) return;
          setMonthlyModalRow(null);
        }}
        onSubmit={handleSubmitMonthly}
      />

      <SavingsGoalTargetDateModal
        open={!!targetDateModalRow}
        row={targetDateModalRow}
        monthLabel={periodLabel}
        isSaving={patchMutation.isPending}
        onClose={() => {
          if (patchMutation.isPending) return;
          setTargetDateModalRow(null);
        }}
        onSubmit={handleSubmitTargetDate}
      />

      <SavingsGoalRenameModal
        open={!!renameModalRow}
        row={renameModalRow}
        monthLabel={periodLabel}
        isSaving={renameMutation.isPending}
        errorMessage={renameError}
        onClose={handleCloseRename}
        onSubmit={handleSubmitRename}
      />

      <SavingsGoalTargetAmountModal
        open={!!targetAmountModalRow}
        row={targetAmountModalRow}
        monthLabel={periodLabel}
        isSaving={targetAmountMutation.isPending}
        errorMessage={targetAmountError}
        onClose={handleCloseChangeTarget}
        onSubmit={handleSubmitChangeTarget}
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
        isMonthOnly={baseIsMonthOnly}
        isSaving={baseSavingsMutation.isPending}
        errorMessage={baseHabitError}
        onClose={handleCloseBaseHabitDialog}
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

