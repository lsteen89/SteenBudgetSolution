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
import type { ExpenseEditScope } from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import {
  canEditMonth,
  canShowUpdateDefault,
} from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { expensesEditorPageDict } from "@/utils/i18n/pages/private/expenses/ExpensesEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DeleteExpenseItemDialog from "./components/DeleteExpenseItemDialog";
import ExpenseItemModal from "./components/ExpenseItemModal";
import ExpensesLedgerSection from "./components/ExpensesLedgerSection";
import ExpensesPlanBalanceStrip from "./components/ExpensesPlanBalanceStrip";
import ExpensesSoulHero from "./components/ExpensesSoulHero";
import type { ExpenseLedgerRowVm } from "./types/expenseEditor.types";
import { buildExpenseLedgerGroups } from "./utils/buildExpenseLedgerGroups";
import { buildExpenseSummary } from "./utils/expenseSummary";

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

  const mutationYearMonth = editableYearMonth ?? "";
  const createMutation = useCreateBudgetMonthExpenseItem(mutationYearMonth);
  const patchMutation = usePatchBudgetMonthExpenseItem(mutationYearMonth);
  const deleteMutation = useDeleteBudgetMonthExpenseItem(mutationYearMonth);

  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
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

        await patchMutation.mutateAsync({
          monthExpenseItemId: modalState.row.id,
          payload: {
            name: values.name,
            categoryId: values.categoryId,
            amountMonthly: values.amountMonthly,
            isActive: values.isActive,
            subscriptionLifecycleStatus:
              modalState.row.subscriptionLifecycleStatus,
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

  const expenseSummary = useMemo(
    () => buildExpenseSummary({ editor, categories }),
    [editor, categories],
  );
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? 0;
  const carryOverTotal =
    dashboardAggregate?.summary.incomingCarryOverAmount ?? 0;
  // Derive the displayed expense total from the same editor rows that feed
  // the hero meter. This guarantees the strip's "Expenses" line, the hero
  // headline, and the meter parts all reconcile to the same number, no matter
  // what the dashboard's totalExpenditure says.
  const expenseTotal = expenseSummary.total;
  const remainingAfterExpenses = incomeTotal + carryOverTotal - expenseTotal;
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
          canUpdatePlan: canShowUpdateDefault(modalState.row),
          initialScope: "currentMonthOnly" as ExpenseEditScope,
        }
      : null;

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          <ExpensesSoulHero
            periodLabel={periodLabel}
            summary={expenseSummary}
            remainingAfterExpenses={remainingAfterExpenses}
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
            {editorQuery.isLoading || categoriesQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadingExpenses")}
              </div>
            ) : editorQuery.isError ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadEditorError")}
              </div>
            ) : categoriesQuery.isError ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadCategoriesError")}
              </div>
            ) : (
              groups.map((group) => (
                <ExpensesLedgerSection
                  key={group.key}
                  group={group}
                  readOnly={readOnly}
                  defaultOpen={true}
                  onEdit={(row) =>
                    setModalState({ open: true, mode: "edit", row })
                  }
                  onPauseToggle={handlePauseToggle}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </BudgetEditorPageShell>

      <ExpenseItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        row={modalEditRow}
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
