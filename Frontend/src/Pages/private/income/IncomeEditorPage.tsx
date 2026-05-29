import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import {
  useBudgetMonthIncomeItems,
  useCreateBudgetMonthIncomeItem,
  useDeleteBudgetMonthIncomeItem,
  usePatchBudgetMonthIncomeItem,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthIncomeItemEditorRowDto,
  IncomeEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { incomeEditorPageDict } from "@/utils/i18n/pages/private/income/IncomeEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DeleteIncomeItemDialog from "./components/DeleteIncomeItemDialog";
import IncomeDistributionStrip from "./components/IncomeDistributionStrip";
import IncomeItemModal from "./components/IncomeItemModal";
import IncomeLedgerSection from "./components/IncomeLedgerSection";
import IncomeSoulHero, {
  type IncomeMonthComparison,
} from "./components/IncomeSoulHero";
import { buildIncomeSummary } from "./utils/buildIncomeSummary";

/** Previous calendar month as `YYYY-MM`, or null when the input is malformed. */
function toPreviousYearMonth(yearMonth: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Localised long month name for a `YYYY-MM`, e.g. "april". */
function monthLongLabel(yearMonth: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return yearMonth;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return yearMonth;
  }
}

const COMPARISON_TOLERANCE = 0.5;

export default function IncomeEditorPage() {
  const locale = useAppLocale();
  const toast = useToast();
  const t = <K extends keyof typeof incomeEditorPageDict.sv>(key: K) =>
    tDict(key, locale, incomeEditorPageDict);
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

  const incomeQuery = useBudgetMonthIncomeItems(
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

  // Previous-month income comparison for the hero pill. We only fetch the
  // previous month when it genuinely exists in the months list and is open
  // or closed, so the comparison is never fabricated. Skipped months are
  // ignored — `liveDashboard` / `snapshotTotals` are both null for them.
  // Mirrors the expense page's MoM wiring.
  const previousYearMonth = useMemo(
    () => (editableYearMonth ? toPreviousYearMonth(editableYearMonth) : null),
    [editableYearMonth],
  );
  const hasComparablePreviousMonth = useMemo(() => {
    if (!previousYearMonth) return false;
    return (monthsStatusQuery.data?.months ?? []).some(
      (m) =>
        m.yearMonth === previousYearMonth &&
        (m.status === "closed" || m.status === "open"),
    );
  }, [monthsStatusQuery.data, previousYearMonth]);
  const previousMonthQuery = useBudgetDashboardMonthQuery(previousYearMonth, {
    enabled: hasComparablePreviousMonth,
  });
  const previousAggregate = useMemo(() => {
    if (!hasComparablePreviousMonth || !previousMonthQuery.data) return null;
    return buildDashboardSummaryAggregate(
      previousMonthQuery.data,
      locale as AppLocale,
    );
  }, [hasComparablePreviousMonth, previousMonthQuery.data, locale]);

  const mutationYearMonth = editableYearMonth ?? "";
  const createMutation = useCreateBudgetMonthIncomeItem(mutationYearMonth);
  const patchMutation = usePatchBudgetMonthIncomeItem(mutationYearMonth);
  const deleteMutation = useDeleteBudgetMonthIncomeItem(mutationYearMonth);

  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; row: BudgetMonthIncomeItemEditorRowDto }
  >({ open: false });
  const [deleteTarget, setDeleteTarget] =
    useState<BudgetMonthIncomeItemEditorRowDto | null>(null);

  const openMonth = monthsStatusQuery.data?.months.find(
    (month) => month.yearMonth === editableYearMonth,
  );
  const readOnly = openMonth ? !canEditMonth(true, openMonth.status) : true;
  const rows = (incomeQuery.data ?? []).filter((row) => !row.isDeleted);

  // Per-kind income split for the hero. Active-only counting matches the
  // backend dashboard total; the page derives `Fritt kvar` from dashboard
  // aggregate terms so all visible numbers reconcile.
  const incomeSummary = useMemo(() => buildIncomeSummary({ rows }), [rows]);

  // Legacy `total` kept as a defensive fallback for the ledger total during
  // early data loading — the new hero is always built from `incomeSummary`.
  const total = incomeSummary.total;

  const handleSubmit = async (values: {
    kind: "sideHustle" | "householdMember";
    name: string;
    amountMonthly: number;
    isActive: boolean;
    scope?: IncomeEditScope;
  }) => {
    if (!modalState.open) return;

    try {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync({
          kind: values.kind,
          name: values.name,
          amountMonthly: values.amountMonthly,
          isActive: values.isActive,
        });
        toast.success(t("itemCreated"));
      } else {
        const row = modalState.row;
        const requestedScope = values.scope ?? "currentMonthOnly";
        const scope = row.canUpdateDefault
          ? requestedScope
          : "currentMonthOnly";

        await patchMutation.mutateAsync({
          monthIncomeItemId: row.id,
          payload: {
            name: row.kind === "salary" ? null : values.name,
            amountMonthly: values.amountMonthly,
            isActive: row.kind === "salary" ? true : values.isActive,
            updateDefault: scope === "currentMonthAndBudgetPlan",
            scope,
          },
        });
        toast.success(t("itemUpdated"));
      }

      setModalState({ open: false });
    } catch {
      toast.error(
        modalState.mode === "create" ? t("itemCreateError") : t("itemUpdateError"),
      );
    }
  };

  const handleDelete = (row: BudgetMonthIncomeItemEditorRowDto) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("itemDeleted"));
      setDeleteTarget(null);
    } catch {
      toast.error(t("itemDeleteError"));
    }
  };

  if (monthsStatusQuery.isLoading) {
    return <EditorState text={t("loadingIncome")} />;
  }

  if (!editableYearMonth) {
    return <EditorState text={t("noOpenMonth")} />;
  }

  // Resolve dashboard-driven distribution terms. We pull each term from the
  // shared dashboard aggregate so the income page reconciles with the rest of
  // the product. Carry-over and salary/household/side counts are real; the
  // distribution strip derives `Fritt kvar` from these same terms so the
  // breakdown is internally consistent. If the dashboard is still loading,
  // we render a calm loading panel below instead of fabricating zeros.
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? total;
  const expenseTotal = dashboardAggregate?.summary.totalExpenditure ?? 0;
  const carryOverTotal =
    dashboardAggregate?.summary.incomingCarryOverAmount ?? 0;
  const savingsTotal = dashboardAggregate?.summary.totalSavings ?? 0;
  const debtTotal = dashboardAggregate?.summary.totalDebtPayments ?? 0;
  const freeToSpend =
    incomeTotal +
    carryOverTotal -
    expenseTotal -
    savingsTotal -
    debtTotal;

  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";
  const currencyCode =
    dashboardAggregate?.summary.currency ?? ("SEK" as const);

  // MoM comparison — present only when the previous month is real and has a
  // usable income total. Otherwise the hero either hides the pill (loading)
  // or shows the calm "comparison coming soon" copy for first-month users.
  const previousIncomeTotal =
    previousAggregate?.summary.totalIncome ?? null;
  const hasUsablePreviousTotal =
    previousIncomeTotal !== null &&
    previousIncomeTotal > COMPARISON_TOLERANCE;
  const heroComparison: IncomeMonthComparison = !hasComparablePreviousMonth
    ? { kind: "none" }
    : hasUsablePreviousTotal && previousYearMonth
      ? (() => {
          const delta = incomeTotal - (previousIncomeTotal as number);
          const direction =
            Math.abs(delta) < COMPARISON_TOLERANCE
              ? "level"
              : delta > 0
                ? "more"
                : "less";
          return {
            kind: "delta" as const,
            direction,
            deltaAbs: Math.abs(delta),
            previousLabel: monthLongLabel(previousYearMonth, locale),
          };
        })()
      : null;

  const previousMonthLabel = previousYearMonth
    ? monthLongLabel(previousYearMonth, locale)
    : null;

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          {/*
           * Hero + distribution strip rely on real income rows AND real
           * dashboard totals. Gate them on both queries so the hero never
           * briefly says "Inga aktiva inkomster" or `0 kr fritt kvar`. While
           * anything is still loading we show a single calm panel rather
           * than flashing fallback zeros.
           */}
          {incomeQuery.isLoading || dashboardMonthQuery.isLoading ? (
            <div
              data-testid="income-editor-loading"
              className="rounded-[1.75rem] border border-eb-stroke/20 bg-eb-surface/85 p-6 text-sm text-eb-text/60"
            >
              {t("loadingIncome")}
            </div>
          ) : incomeQuery.isError ||
            dashboardMonthQuery.isError ||
            !dashboardAggregate ? (
            // Honesty gate: the hero split and the distribution strip both
            // depend on real dashboard totals (expenses/savings/debts/
            // carry-over). If the dashboard endpoint errors or never produced
            // an aggregate, we must NOT render with `?? 0` fallbacks — that
            // would fake `Utgifter / Sparande / Skulder / Överskott = 0` and
            // inflate `Fritt kvar`. Income rows alone are not enough to make
            // the equation honest, so we show the calm error panel instead.
            <div
              data-testid="income-editor-error"
              className="rounded-[1.75rem] border border-eb-stroke/20 bg-eb-surface/85 p-6 text-sm text-eb-text/60"
            >
              {t("loadEditorError")}
            </div>
          ) : (
            <>
              <IncomeSoulHero
                periodLabel={periodLabel}
                summary={incomeSummary}
                freeToSpend={freeToSpend}
                comparison={heroComparison}
                readOnly={readOnly}
                onCreate={() => setModalState({ open: true, mode: "create" })}
              />

              <IncomeDistributionStrip
                currencyCode={currencyCode}
                locale={locale as AppLocale}
                incomeMonthly={incomeTotal}
                carryOverMonthly={carryOverTotal}
                expensesMonthly={expenseTotal}
                savingsMonthly={savingsTotal}
                debtsMonthly={debtTotal}
                previousMonthLabel={previousMonthLabel}
              />

              <IncomeLedgerSection
                rows={rows}
                total={total}
                readOnly={readOnly}
                onEdit={(row) =>
                  setModalState({ open: true, mode: "edit", row })
                }
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </BudgetEditorPageShell>

      <IncomeItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        row={modalState.open && modalState.mode === "edit" ? modalState.row : null}
        monthLabel={periodLabel}
        isSaving={createMutation.isPending || patchMutation.isPending}
        onClose={() => setModalState({ open: false })}
        onSubmit={handleSubmit}
      />
      <DeleteIncomeItemDialog
        open={!!deleteTarget}
        itemName={deleteTarget?.name ?? null}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
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
