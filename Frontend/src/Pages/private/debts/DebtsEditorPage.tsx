import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import {
  useBudgetMonthDebtEditor,
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
import DebtLedgerGroup from "./components/DebtLedgerGroup";
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

  // The planned-payment modal is the only mutation PR 6 wires. It still takes
  // the legacy `BudgetMonthDebtEditorRowDto` shape because its body is
  // unchanged from Stage 0; we adapt the richer PR 5 row into that shape so
  // the modal's existing tests stay green.
  const [modalRow, setModalRow] =
    useState<BudgetMonthDebtEditorRowDto | null>(null);

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
            <DebtsEditorEmptyState readOnly={readOnly} />
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
