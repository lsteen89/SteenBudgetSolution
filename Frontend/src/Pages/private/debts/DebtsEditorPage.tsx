import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import {
  useArchiveBudgetMonthDebt,
  useBudgetMonthDebtEditor,
  useCreateBudgetMonthDebt,
  useMarkBudgetMonthDebtPaidOff,
  usePatchBudgetMonthDebt,
  usePatchBudgetMonthDebtDetails,
  useRemoveBudgetMonthDebt,
  useRestoreBudgetMonthDebt,
  useSetBudgetMonthDebtParticipation,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthDebtEditorRowDto,
  DebtEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import type {
  DebtEditorRowDto,
} from "@/types/budget/DebtEditorDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import DebtCreateModal, {
  type DebtCreateSubmitValues,
} from "./components/DebtCreateModal";
import DebtDetailsModal, {
  type DebtDetailsSubmitValues,
} from "./components/DebtDetailsModal";
import DebtLedgerGroup from "./components/DebtLedgerGroup";
import DebtLifecycleConfirmDialog, {
  type DebtLifecycleAction,
  type DebtLifecycleConfirmOptions,
} from "./components/DebtLifecycleConfirmDialog";
import DebtPlannedPaymentModal from "./components/DebtPlannedPaymentModal";
import DebtsBalanceStrip from "./components/DebtsBalanceStrip";
import DebtsEditorEmptyState from "./components/DebtsEditorEmptyState";
import DebtsSoulHero from "./components/DebtsSoulHero";
import {
  DEBT_GROUP_ORDER,
  groupDebtRows,
} from "./utils/debtEditorGroups";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/**
 * Pull a user-facing string out of whatever the mutation rejected with. The
 * api envelope helper throws an `ApiProblem` (object with `message`), but we
 * also handle plain `Error` and unknown values so the modal always renders
 * something readable instead of `[object Object]`.
 */
function extractMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const maybe = error as { message?: unknown };
    if (typeof maybe.message === "string" && maybe.message.trim().length > 0) {
      return maybe.message;
    }
  }
  return fallback;
}

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

  const debtEditorQuery = useBudgetMonthDebtEditor(
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
  const createMutation = useCreateBudgetMonthDebt(mutationYearMonth);
  const detailsMutation = usePatchBudgetMonthDebtDetails(mutationYearMonth);
  // PR 8 — lifecycle / participation mutations. Each invalidates the debt
  // editor read model and dashboard projection on success so groups, totals,
  // and the remaining-money equation reconcile from backend data (never
  // optimistic).
  const participationMutation =
    useSetBudgetMonthDebtParticipation(mutationYearMonth);
  const markPaidOffMutation = useMarkBudgetMonthDebtPaidOff(mutationYearMonth);
  const archiveMutation = useArchiveBudgetMonthDebt(mutationYearMonth);
  const restoreMutation = useRestoreBudgetMonthDebt(mutationYearMonth);
  const removeMutation = useRemoveBudgetMonthDebt(mutationYearMonth);

  // The planned-payment modal still takes the legacy `BudgetMonthDebtEditorRowDto`
  // shape because its body is unchanged from Stage 0; we adapt the richer
  // PR 5 row into that shape so the modal's existing tests stay green.
  const [modalRow, setModalRow] =
    useState<BudgetMonthDebtEditorRowDto | null>(null);
  // PR 7: add and edit-details drawers. Errors are surfaced as plain
  // messages (the parent owns the mutation, so the modal stays stateless
  // about React-Query).
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<DebtEditorRowDto | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  // PR 8 — lifecycle confirmation dialog. Holds the row and the chosen action;
  // the dialog itself collects the secondary choices (set-balance-to-zero /
  // re-include) and hands them back on confirm.
  const [lifecycleConfirm, setLifecycleConfirm] = useState<{
    row: DebtEditorRowDto;
    action: DebtLifecycleAction;
  } | null>(null);

  const lifecycleWorking =
    participationMutation.isPending ||
    markPaidOffMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    removeMutation.isPending;

  const editorData = debtEditorQuery.data ?? null;
  // Backend `isReadOnly` is the source of truth: closed/skipped months stop
  // editing regardless of row state. We also defensively gate on the status
  // queue in case the editor and status queries disagree mid-transition.
  const openMonth = monthsStatusQuery.data?.months.find(
    (month) => month.yearMonth === editableYearMonth,
  );
  const readOnly = editorData
    ? editorData.isReadOnly
    : openMonth
      ? !canEditMonth(true, openMonth.status)
      : true;

  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";

  const remainingInBudget =
    dashboardAggregate?.summary.remainingToSpend ?? null;

  const grouped = useMemo(
    () => (editorData ? groupDebtRows(editorData.rows) : null),
    [editorData],
  );

  const handleEditPayment = (row: DebtEditorRowDto) => {
    // Adapt the PR 5 row to the legacy modal contract. We only carry the
    // fields the modal actually reads — the rest are filler so the type
    // stays satisfied without claiming source/lifecycle data the legacy DTO
    // does not own.
    const legacyRow: BudgetMonthDebtEditorRowDto = {
      id: row.id,
      sourceDebtId: row.sourceDebtId,
      name: row.name,
      type: row.type,
      balance: row.balance,
      apr: row.apr,
      monthlyFee: row.monthlyFee,
      minPayment: row.minPayment,
      termMonths: row.termMonths,
      monthlyPayment: row.monthlyPayment,
      status: "active",
      isDeleted: false,
      isMonthOnly: row.isMonthOnly,
      canUpdateDefault: row.actions.canUpdatePlan,
    };
    setModalRow(legacyRow);
  };

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

  // PR 7 — open the edit-details drawer from a row kebab. The row already
  // carries the PR 5 read-model shape, so no adaptation is needed here.
  const handleEditDetails = (row: DebtEditorRowDto) => {
    setDetailsError(null);
    setDetailsRow(row);
  };

  const handleOpenCreate = () => {
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (values: DebtCreateSubmitValues) => {
    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        name: values.name,
        type: values.type,
        balance: values.balance,
        apr: values.apr,
        monthlyFee: values.monthlyFee,
        minPayment: values.minPayment,
        termMonths: values.termMonths,
        monthlyPayment: values.monthlyPayment,
        scope: values.scope,
      });
      toast.success(t("createSuccess"));
      setCreateOpen(false);
    } catch (error) {
      setCreateError(extractMessage(error, t("createError")));
    }
  };

  const handleDetailsSubmit = async (values: DebtDetailsSubmitValues) => {
    if (!detailsRow) return;
    setDetailsError(null);
    try {
      await detailsMutation.mutateAsync({
        monthDebtId: detailsRow.id,
        payload: {
          name: values.name,
          type: values.type,
          apr: values.apr,
          monthlyFee: values.monthlyFee,
          minPayment: values.minPayment,
          termMonths: values.termMonths,
          monthlyPayment: values.monthlyPayment,
          scope: values.scope,
        },
      });
      toast.success(t("detailsSuccess"));
      setDetailsRow(null);
    } catch (error) {
      setDetailsError(extractMessage(error, t("detailsError")));
    }
  };

  // PR 8 — open the lifecycle confirmation dialog for the chosen action. The
  // row already carries the PR 5 read-model shape with action permissions, so
  // no adaptation is needed.
  const handleLifecycleAction = (
    row: DebtEditorRowDto,
    action: DebtLifecycleAction,
  ) => {
    setLifecycleConfirm({ row, action });
  };

  const closeLifecycleConfirm = () => {
    if (lifecycleWorking) return;
    setLifecycleConfirm(null);
  };

  const handleLifecycleConfirm = async (
    options: DebtLifecycleConfirmOptions,
  ) => {
    if (!lifecycleConfirm) return;
    const { row, action } = lifecycleConfirm;
    const monthDebtId = row.id;

    try {
      switch (action) {
        case "skip":
          await participationMutation.mutateAsync({
            monthDebtId,
            payload: { participation: "notIncluded" },
          });
          toast.success(t("lifecycleSkipSuccess"));
          break;
        case "include":
          await participationMutation.mutateAsync({
            monthDebtId,
            payload: { participation: "included" },
          });
          toast.success(t("lifecycleIncludeSuccess"));
          break;
        case "markPaidOff":
          await markPaidOffMutation.mutateAsync({
            monthDebtId,
            payload: { setBalanceToZero: options.setBalanceToZero },
          });
          toast.success(t("lifecyclePaidSuccess"));
          break;
        case "archive":
          await archiveMutation.mutateAsync({
            monthDebtId,
            payload: {},
          });
          toast.success(t("lifecycleArchiveSuccess"));
          break;
        case "restore":
          await restoreMutation.mutateAsync({
            monthDebtId,
            payload: { reIncludeCurrentMonth: options.reIncludeCurrentMonth },
          });
          toast.success(t("lifecycleRestoreSuccess"));
          break;
        case "remove":
          await removeMutation.mutateAsync({
            monthDebtId,
            payload: {},
          });
          toast.success(t("lifecycleRemoveSuccess"));
          break;
      }
      setLifecycleConfirm(null);
    } catch (error) {
      // Keep the dialog open and surface a backend-truthful message; local
      // state is never optimistically mutated, so the row stays as the read
      // model reported it.
      toast.error(extractMessage(error, t("lifecycleError")));
    }
  };

  if (monthsStatusQuery.isLoading) {
    return <EditorState text={t("loadingDebts")} />;
  }

  if (!editableYearMonth) {
    return <EditorState text={t("noOpenMonth")} />;
  }

  if (debtEditorQuery.isLoading || dashboardMonthQuery.isLoading) {
    return (
      <BudgetEditorPageShell>
        <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
          {t("loadingDebts")}
        </div>
      </BudgetEditorPageShell>
    );
  }

  if (debtEditorQuery.isError || !editorData || !grouped) {
    return (
      <BudgetEditorPageShell>
        <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
          {t("loadEditorError")}
        </div>
      </BudgetEditorPageShell>
    );
  }

  const summary = editorData.summary;
  const activeRows = grouped.active;
  const allGroupsEmpty = editorData.rows.length === 0;

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          <DebtsSoulHero
            yearMonthLabel={periodLabel}
            summary={summary}
            activeRows={activeRows}
            remainingInBudget={remainingInBudget}
            readOnly={readOnly}
            onAddDebt={readOnly ? undefined : handleOpenCreate}
          />

          {!allGroupsEmpty ? (
            <DebtsBalanceStrip
              summary={summary}
              activeRows={activeRows}
              freeAfterDebts={remainingInBudget}
            />
          ) : null}

          {readOnly ? (
            <p
              data-testid="debts-readonly-banner"
              className="m-0 flex items-start gap-2 rounded-2xl border border-eb-warning/25 bg-[rgb(217_119_6_/0.06)] px-4 py-3 text-[13px] text-[#7c4a03]"
            >
              <CalendarDays
                className="mt-0.5 h-4 w-4 flex-none"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>
                {interpolate(t("readOnlyBanner"), {
                  yearMonthLabel: periodLabel,
                })}
              </span>
            </p>
          ) : null}

          {allGroupsEmpty ? (
            <DebtsEditorEmptyState
              readOnly={readOnly}
              onAddDebt={readOnly ? undefined : handleOpenCreate}
            />
          ) : (
            <div className="space-y-4">
              {DEBT_GROUP_ORDER.map((copy) => (
                <DebtLedgerGroup
                  key={copy.group}
                  copy={copy}
                  rows={grouped[copy.group]}
                  yearMonthLabel={periodLabel}
                  readOnly={readOnly}
                  onEditPayment={handleEditPayment}
                  onEditDetails={readOnly ? undefined : handleEditDetails}
                  onLifecycleAction={
                    readOnly ? undefined : handleLifecycleAction
                  }
                  defaultOpen={copy.group !== "archived"}
                />
              ))}
            </div>
          )}
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

      <DebtCreateModal
        open={createOpen}
        monthLabel={periodLabel}
        isSaving={createMutation.isPending}
        submitErrorMessage={createError}
        onClose={() => {
          if (createMutation.isPending) return;
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleCreateSubmit}
      />

      <DebtDetailsModal
        open={!!detailsRow}
        row={detailsRow}
        monthLabel={periodLabel}
        isSaving={detailsMutation.isPending}
        submitErrorMessage={detailsError}
        onClose={() => {
          if (detailsMutation.isPending) return;
          setDetailsRow(null);
          setDetailsError(null);
        }}
        onSubmit={handleDetailsSubmit}
      />

      <DebtLifecycleConfirmDialog
        open={!!lifecycleConfirm}
        action={lifecycleConfirm?.action ?? null}
        debtName={lifecycleConfirm?.row.name ?? ""}
        yearMonthLabel={periodLabel}
        isWorking={lifecycleWorking}
        onConfirm={handleLifecycleConfirm}
        onClose={closeLifecycleConfirm}
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
