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
  BudgetMonthIncomeItemKind,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { incomeEditorPageDict } from "@/utils/i18n/pages/private/income/IncomeEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DeleteIncomeItemDialog from "./components/DeleteIncomeItemDialog";
import IncomeDistributionStrip from "./components/IncomeDistributionStrip";
import IncomeItemModal, {
  type IncomeItemSubmitValues,
} from "./components/IncomeItemModal";
import IncomeLedgerSection from "./components/IncomeLedgerSection";
import IncomeSoulHero, {
  type IncomeMonthComparison,
} from "./components/IncomeSoulHero";
import type {
  IncomeLedgerGroupVm,
  IncomeLedgerRowVm,
} from "./types/incomeEditor.types";
import { buildIncomeLedgerGroups } from "./utils/buildIncomeLedgerGroups";
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

  // Modal state distinguishes "global add" (hero CTA, kind unknown) from
  // "group add" (per-group `Lägg till`, kind preselected). The preset kind
  // is plumbed into `IncomeItemModal` so the drawer's type selector seeds
  // to the right option. PR 4 will use the same `presetKind` value to also
  // hide the selector when group-add is the source; PR 3 keeps the
  // selector visible so the user can still switch types if they clicked
  // the wrong group.
  const [modalState, setModalState] = useState<
    | { open: false }
    | {
        open: true;
        mode: "create";
        presetKind: Exclude<BudgetMonthIncomeItemKind, "salary"> | null;
      }
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

  // Grouped ledger view-model. Salary first, then household income, then
  // side income — order is locked in `buildIncomeLedgerGroups`. Inactive
  // rows are kept in their own quiet subsection per group.
  const groups = useMemo(() => buildIncomeLedgerGroups({ rows }), [rows]);

  const handleSubmit = async (values: IncomeItemSubmitValues) => {
    if (!modalState.open) return;

    try {
      if (values.mode === "create") {
        await createMutation.mutateAsync({
          kind: values.kind,
          name: values.name,
          amountMonthly: values.amountMonthly,
          isActive: values.isActive,
        });
        toast.success(t("itemCreated"));
      } else {
        // Edit branch never receives `kind` — the patch endpoint ignores
        // it and the modal's discriminated submit shape drops it from the
        // wire payload. The row's kind still drives the salary special
        // cases (locked name, forced-active) below; that's read from the
        // row in modal state, not the form.
        if (modalState.mode !== "edit") return;
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

  /**
   * Find the wire row for a ledger VM by id. The ledger renders
   * `IncomeLedgerRowVm` (a structural superset of the wire row), but every
   * mutation needs the canonical DTO so we look it back up. Returns null
   * for the (very unlikely) race where a row was just removed from the
   * editor list between render and click.
   */
  const findRowById = (id: string) =>
    rows.find((candidate) => candidate.id === id) ?? null;

  const handleEditRow = (rowVm: IncomeLedgerRowVm) => {
    const wireRow = findRowById(rowVm.id);
    if (!wireRow) return;
    setModalState({ open: true, mode: "edit", row: wireRow });
  };

  const handleDeleteRow = (rowVm: IncomeLedgerRowVm) => {
    // Salary cannot be deleted (backend enforces it, but the kebab also
    // hides the action for salary). Guard defensively here so a stale UI
    // never opens the confirmation dialog for a salary row.
    if (rowVm.kind === "salary") return;
    const wireRow = findRowById(rowVm.id);
    if (!wireRow) return;
    handleDelete(wireRow);
  };

  /**
   * Activate or deactivate a side/household row for the current month.
   *
   * Always month-only — toggling a row off this month should not change the
   * plan. The patch endpoint demands `amountMonthly` even on an active-only
   * change, so we re-send the current amount and let the backend treat it
   * as a no-op for the money field. Salary is always active by backend
   * invariant; we don't expose the toggle in the row menu and guard here.
   */
  const handleToggleActive = async (rowVm: IncomeLedgerRowVm) => {
    if (rowVm.kind === "salary") return;
    const wireRow = findRowById(rowVm.id);
    if (!wireRow) return;

    try {
      await patchMutation.mutateAsync({
        monthIncomeItemId: wireRow.id,
        payload: {
          name: wireRow.name,
          amountMonthly: wireRow.amountMonthly,
          isActive: !wireRow.isActive,
          updateDefault: false,
          scope: "currentMonthOnly",
        },
      });
      toast.success(t("itemUpdated"));
    } catch {
      toast.error(t("itemUpdateError"));
    }
  };

  /**
   * Group-level add. Opens the create drawer with the group's kind passed
   * through as `presetKind` so the modal's type selector seeds to the
   * right option — this is what makes group add genuinely different from
   * the global hero add. PR 4 will use the same plumbing to hide the
   * type selector entirely when group-add is the source; PR 3 keeps it
   * visible so the user can switch types after clicking the wrong group.
   *
   * Salary is never preset here: `canCreateInGroup` is false for the
   * salary group, so the section never renders an add button for it. We
   * still narrow the type defensively in case that contract ever
   * regresses, since the create endpoint rejects `salary` server-side.
   */
  const handleCreateInGroup = (group: IncomeLedgerGroupVm) => {
    const presetKind =
      group.key === "householdMember" || group.key === "sideHustle"
        ? group.key
        : null;
    setModalState({ open: true, mode: "create", presetKind });
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
  // Defensive fallback only: the render branch below already guards on
  // `dashboardAggregate`, so this `??` is reached only in the brief window
  // between mount and the first dashboard resolve. We use the editor's own
  // active-rows total (same counting rule as the backend dashboard) so the
  // fallback at least lines up with what the ledger groups will render.
  const incomeTotal =
    dashboardAggregate?.summary.totalIncome ?? incomeSummary.total;
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
                onCreate={() =>
                  // Hero CTA — kind is unknown, type selector defaults to
                  // sideHustle inside the modal.
                  setModalState({
                    open: true,
                    mode: "create",
                    presetKind: null,
                  })
                }
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

              {/*
                Three grouped ledger cards in locked order: Lön first, then
                Hushållsinkomst, then Sidoinkomst. Each section owns its own
                open/close state and group-level add affordance. The salary
                group renders no add button (single-row group by backend
                invariant) — `IncomeLedgerSection` reads that off the VM.
              */}
              <div className="space-y-3">
                {groups.map((group) => (
                  <IncomeLedgerSection
                    key={group.key}
                    group={group}
                    monthLabel={periodLabel}
                    readOnly={readOnly}
                    onEdit={handleEditRow}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDeleteRow}
                    onCreateInGroup={handleCreateInGroup}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </BudgetEditorPageShell>

      <IncomeItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        row={modalState.open && modalState.mode === "edit" ? modalState.row : null}
        monthLabel={periodLabel}
        presetKind={
          modalState.open && modalState.mode === "create"
            ? modalState.presetKind
            : null
        }
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
