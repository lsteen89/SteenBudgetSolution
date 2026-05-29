import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import {
  useBudgetMonthEditor,
  useCreateBudgetMonthExpenseItem,
  useDeleteBudgetMonthExpenseItem,
  usePatchBudgetMonthExpenseItem,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useExpenseCategories } from "@/hooks/budget/useExpenseCategories";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { CreateExpenseItemApiPayload } from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import type {
  ExpenseEditScope,
  SubscriptionLifecycleStatus,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import {
  canEditMonth,
  canShowUpdateDefault,
} from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { asCategoryKey } from "@/utils/i18n/budget/categories";
import { expensesEditorPageDict } from "@/utils/i18n/pages/private/expenses/ExpensesEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DeleteExpenseItemDialog from "./components/DeleteExpenseItemDialog";
import ExpenseItemModal from "./components/ExpenseItemModal";
import ExpensesLedgerSection from "./components/ExpensesLedgerSection";
import ExpensesPlanBalanceStrip from "./components/ExpensesPlanBalanceStrip";
import ExpensesSoulHero, {
  type ExpenseMonthComparison,
} from "./components/ExpensesSoulHero";
import type { ExpenseLedgerRowVm } from "./types/expenseEditor.types";
import { buildExpenseLedgerGroups } from "./utils/buildExpenseLedgerGroups";
import { buildExpenseSummary } from "./utils/expenseSummary";

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

export default function ExpensesEditorPage() {
  const toast = useToast();
  const locale = useAppLocale();
  const t = <K extends keyof typeof expensesEditorPageDict.sv>(key: K) =>
    tDict(key, locale, expensesEditorPageDict);

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
  const editorQuery = useBudgetMonthEditor(
    editableYearMonth ?? undefined,
    !!editableYearMonth,
  );
  const categoriesQuery = useExpenseCategories({ enabled: !!editableYearMonth });

  // Month-over-month comparison source for the hero pill. We only fetch the
  // previous month when it genuinely exists in the months list and is not a
  // skipped month, so the comparison is never fabricated. Uses the existing
  // dashboard-month endpoint; gated + retry-safe, so a missing month never
  // spams 404s.
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
  const createMutation = useCreateBudgetMonthExpenseItem(mutationYearMonth);
  const patchMutation = usePatchBudgetMonthExpenseItem(mutationYearMonth);
  const deleteMutation = useDeleteBudgetMonthExpenseItem(mutationYearMonth);

  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create"; categoryId?: string }
    | { open: true; mode: "edit"; row: ExpenseLedgerRowVm }
  >({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<ExpenseLedgerRowVm | null>(
    null,
  );

  const editor = editorQuery.data;
  const categories = categoriesQuery.data ?? [];
  const month = editor?.month ?? null;
  const readOnly = month ? !canEditMonth(month.isEditable, month.status) : true;
  const groups = useMemo(() => {
    if (!editor) return [];

    return buildExpenseLedgerGroups({
      editor,
      categories,
      locale,
    });
  }, [editor, categories, locale]);
  // Hoisted above the early returns to keep the hook order stable across
  // renders. The previous placement (below the loading/error/no-open-month
  // guards) violated the rules of hooks: when a guard fired on the first
  // render and unfired on the next, this `useMemo` switched from "absent"
  // to "present" and React threw
  //   "Rendered more hooks than during the previous render."
  // which left the page blank on cold load. Cold-load reproduction was the
  // PR 7 E2E spec; the dev environment usually rendered fine because the
  // months-status query was already cached from an earlier dashboard
  // navigation, so the guard never fired in the first place.
  const expenseSummary = useMemo(
    () => buildExpenseSummary({ editor, categories }),
    [editor, categories],
  );

  // Resolve a sensible category for a group-scoped "+ Lägg till" so the create
  // modal opens already pointed at that group's context. Falls back to the
  // first category when the group's preferred codes are not present (defensive
  // — the seeded category set always contains these). Mirrors the
  // category-key → group mapping used by buildExpenseLedgerGroups.
  const categoryIdForGroup = (
    groupKey: "fixed" | "variable" | "subscription",
  ): string | undefined => {
    const preferredKeys =
      groupKey === "fixed"
        ? ["fixed", "housing"]
        : groupKey === "subscription"
          ? ["subscription"]
          : ["other", "food", "transport", "clothing"];

    for (const key of preferredKeys) {
      const match = categories.find((c) => asCategoryKey(c.code) === key);
      if (match) return match.id;
    }
    return categories[0]?.id;
  };

  if (monthsStatusQuery.isLoading) {
    return (
      <BudgetEditorPageShell>
        <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface p-6 text-sm text-eb-text/60">
          {t("loadingExpenses")}
        </div>
      </BudgetEditorPageShell>
    );
  }

  if (monthsStatusQuery.isError) {
    return (
      <BudgetEditorPageShell>
        <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface p-6 text-sm text-eb-text/60">
          {t("loadEditorError")}
        </div>
      </BudgetEditorPageShell>
    );
  }

  if (!editableYearMonth) {
    return (
      <BudgetEditorPageShell>
        <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface p-6 text-sm text-eb-text/60">
          {t("noOpenMonth")}
        </div>
      </BudgetEditorPageShell>
    );
  }

  const handleModalSubmit = async (
    values: CreateExpenseItemApiPayload & {
      updateDefault?: boolean;
      scope?: ExpenseEditScope;
      subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
    },
  ) => {
    try {
      if (!modalState.open) return;

      if (modalState.mode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("itemCreated"));
      } else {
        const requestedScope = values.scope ?? "currentMonthOnly";
        const canUpdatePlan = canShowUpdateDefault(modalState.row);
        const scope: ExpenseEditScope = canUpdatePlan
          ? requestedScope
          : "currentMonthOnly";

        // The modal owns lifecycle when the selected category is a
        // subscription, and submits `null` for non-subscription categories
        // (backend rule). Fall back to the existing row value only when the
        // modal did not provide one (defensive — should not happen).
        const lifecycle =
          values.subscriptionLifecycleStatus !== undefined
            ? values.subscriptionLifecycleStatus
            : modalState.row.subscriptionLifecycleStatus;

        await patchMutation.mutateAsync({
          monthExpenseItemId: modalState.row.id,
          payload: {
            name: values.name,
            categoryId: values.categoryId,
            amountMonthly: values.amountMonthly,
            isActive: values.isActive,
            subscriptionLifecycleStatus: lifecycle,
            updateDefault: scope === "currentMonthAndBudgetPlan",
            scope,
          },
        });

        toast.success(t("itemUpdated"));
      }

      setModalState({ open: false });
    } catch {
      toast.error(
        modalState.open && modalState.mode === "create"
          ? t("itemCreateError")
          : t("itemUpdateError"),
      );
    }
  };

  const handlePauseToggle = async (row: ExpenseLedgerRowVm) => {
    try {
      const nextIsActive = !row.isActive;

      await patchMutation.mutateAsync({
        monthExpenseItemId: row.id,
        payload: {
          name: row.name,
          categoryId: row.categoryId,
          amountMonthly: row.amountMonthly,
          isActive: nextIsActive,
          subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
          updateDefault: false,
          scope: "currentMonthOnly",
        },
      });

      toast.success(row.isActive ? t("itemPaused") : t("itemResumed"));
    } catch {
      toast.error(t("itemPauseError"));
    }
  };

  // Subscription lifecycle mutation. The row keeps its current name/category/
  // amount — lifecycle is the primary thing changing — and the update
  // applies to the current month only (`scope: currentMonthOnly`,
  // `updateDefault: false`). Backend rules:
  //   - lifecycle is valid only on subscription rows (caller guarantees this)
  //   - paused/cancelled subs are excluded from monthly totals
  //
  // isActive semantics: `deriveRowState` lets `isActive === false` win over
  // lifecycle. If a row is currently inactive (e.g. the user previously hit
  // generic "pause") and the user picks resume/reactivate, the row would
  // still render as inactive — confusing. Treat lifecycle=active as a
  // restore-to-counting intent and force `isActive: true`. For paused/
  // cancelled transitions, keep the user's existing isActive value so we
  // don't surprise them by re-enabling a row they had toggled off.
  const handleLifecycleChange = async (
    row: ExpenseLedgerRowVm,
    next: SubscriptionLifecycleStatus,
  ) => {
    const previous: SubscriptionLifecycleStatus =
      row.subscriptionLifecycleStatus ?? "active";
    const nextIsActive = next === "active" ? true : row.isActive;

    try {
      await patchMutation.mutateAsync({
        monthExpenseItemId: row.id,
        payload: {
          name: row.name,
          categoryId: row.categoryId,
          amountMonthly: row.amountMonthly,
          isActive: nextIsActive,
          subscriptionLifecycleStatus: next,
          updateDefault: false,
          scope: "currentMonthOnly",
        },
      });

      // Pick the toast that matches the transition rather than only the
      // target state. Resuming from paused and reactivating from cancelled
      // both land on `active`, but read more clearly with distinct copy.
      if (next === "paused") {
        toast.success(t("subscriptionPaused"));
      } else if (next === "cancelled") {
        toast.success(t("subscriptionCancelled"));
      } else if (previous === "cancelled") {
        toast.success(t("subscriptionReactivated"));
      } else {
        toast.success(t("subscriptionResumed"));
      }
    } catch {
      toast.error(t("subscriptionUpdateError"));
    }
  };

  const handleDelete = async (row: ExpenseLedgerRowVm) => {
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

  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? 0;
  const carryOverTotal =
    dashboardAggregate?.summary.incomingCarryOverAmount ?? 0;
  // Derive the displayed expense total from the same editor rows that feed
  // the hero meter. This guarantees the strip's "Expenses" line, the hero
  // headline, and the meter parts all reconcile to the same number, no matter
  // what the dashboard's totalExpenditure says.
  const expenseTotal = expenseSummary.total;

  // Build the hero pill comparison. `none` when there is no comparable prior
  // month (hero shows a quiet neutral state — e.g. the first budgeted month).
  // `null` when the previous month exists but has no usable dashboard total
  // yet, or is still loading — the hero hides the pill rather than comparing
  // against an unreliable (e.g. zero / not-yet-materialized) number. Otherwise
  // a real delta between this month's planned expenses and the previous
  // month's total, using the live editor total so the pill stays consistent
  // with the hero headline above it.
  const previousExpenseTotal =
    previousAggregate?.summary.totalExpenditure ?? null;
  const hasUsablePreviousTotal =
    previousExpenseTotal !== null &&
    previousExpenseTotal > COMPARISON_TOLERANCE;
  const heroComparison: ExpenseMonthComparison = !hasComparablePreviousMonth
    ? { kind: "none" }
    : hasUsablePreviousTotal && previousYearMonth
      ? (() => {
          const delta = expenseTotal - (previousExpenseTotal as number);
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
  const currencyCode =
    dashboardAggregate?.summary.currency ?? ("SEK" as const);
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth;
  const modalEditRow =
    modalState.open && modalState.mode === "edit"
      ? {
          id: modalState.row.id,
          name: modalState.row.name,
          categoryId: modalState.row.categoryId,
          amountMonthly: modalState.row.amountMonthly,
          isActive: modalState.row.isActive,
          subscriptionLifecycleStatus:
            modalState.row.subscriptionLifecycleStatus,
          canUpdatePlan: canShowUpdateDefault(modalState.row),
          initialScope: "currentMonthOnly" as ExpenseEditScope,
          // Source-plan values (PR 5) feed the modal's two-column current-
          // month / budget-plan preview. Null for month-only rows, in which
          // case the modal falls back to the single-column preview.
          sourceName: modalState.row.sourceName,
          sourceCategoryId: modalState.row.sourceCategoryId,
          sourceAmountMonthly: modalState.row.sourceAmountMonthly,
          sourceIsActive: modalState.row.sourceIsActive,
        }
      : null;

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          {/*
           * Hero + balance strip rely on real editor rows, real category
           * mapping, and (for the strip) real income/carry-over totals. Gate
           * them on every input being loaded so the hero never briefly says
           * "No active expenses" and the strip never briefly shows
           * `0 - 0 - <expenses> = …`. While anything is still loading we show
           * a single calm panel instead of fallback zeros.
           */}
          {editorQuery.isLoading ||
          categoriesQuery.isLoading ||
          dashboardMonthQuery.isLoading ? (
            <div
              data-testid="expenses-editor-loading"
              className="rounded-[1.75rem] border border-eb-stroke/20 bg-eb-surface/85 p-6 text-sm text-eb-text/60"
            >
              {t("loadingExpenses")}
            </div>
          ) : editorQuery.isError ? (
            <div
              data-testid="expenses-editor-error"
              className="rounded-[1.75rem] border border-eb-stroke/20 bg-eb-surface/85 p-6 text-sm text-eb-text/60"
            >
              {t("loadEditorError")}
            </div>
          ) : categoriesQuery.isError ? (
            <div
              data-testid="expenses-categories-error"
              className="rounded-[1.75rem] border border-eb-stroke/20 bg-eb-surface/85 p-6 text-sm text-eb-text/60"
            >
              {t("loadCategoriesError")}
            </div>
          ) : (
            <>
              <ExpensesSoulHero
                periodLabel={periodLabel}
                summary={expenseSummary}
                comparison={heroComparison}
                readOnly={readOnly}
                onCreate={() => setModalState({ open: true, mode: "create" })}
              />

              <ExpensesPlanBalanceStrip
                currencyCode={currencyCode}
                locale={locale as AppLocale}
                incomeMonthly={incomeTotal}
                carryOverMonthly={carryOverTotal}
                expensesMonthly={expenseTotal}
                summary={expenseSummary}
              />

              <div className="space-y-4">
                {groups.map((group) => (
                  <ExpensesLedgerSection
                    key={group.key}
                    group={group}
                    readOnly={readOnly}
                    defaultOpen={true}
                    onEdit={(row) =>
                      setModalState({ open: true, mode: "edit", row })
                    }
                    onPauseToggle={handlePauseToggle}
                    onLifecycleChange={handleLifecycleChange}
                    onDelete={handleDelete}
                    onCreateInGroup={(g) =>
                      setModalState({
                        open: true,
                        mode: "create",
                        categoryId: categoryIdForGroup(g.key),
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </BudgetEditorPageShell>

      <ExpenseItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        row={modalEditRow}
        createCategoryId={
          modalState.open && modalState.mode === "create"
            ? modalState.categoryId
            : undefined
        }
        monthLabel={periodLabel}
        categories={categories}
        isSaving={createMutation.isPending || patchMutation.isPending}
        onClose={() => setModalState({ open: false })}
        onSubmit={handleModalSubmit}
      />
      <DeleteExpenseItemDialog
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
