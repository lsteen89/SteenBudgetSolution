import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";
import {
  useBudgetMonthEditor,
  useCreateBudgetMonthExpenseItem,
  useDeleteBudgetMonthExpenseItem,
  usePatchBudgetMonthExpenseItem,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useExpenseCategories } from "@/hooks/budget/useExpenseCategories";
import { buildDashboardSummaryAggregate } from "@/hooks/dashboard/buildDashboardSummaryAggregate";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { CreateExpenseItemApiPayload } from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { expensesEditorPageDict } from "@/utils/i18n/pages/private/expenses/ExpensesEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useMemo, useState } from "react";
import DeleteExpenseItemDialog from "./components/DeleteExpenseItemDialog";
import ExpenseItemModal from "./components/ExpenseItemModal";
import ExpensesEditorWorkspaceBar from "./components/ExpensesEditorWorkspaceBar";
import ExpensesLedgerSection from "./components/ExpensesLedgerSection";
import type { ExpenseLedgerRowVm } from "./types/expenseEditor.types";
import { buildExpenseLedgerGroups } from "./utils/buildExpenseLedgerGroups";

export default function ExpensesEditorPage() {
  const toast = useToast();
  const locale = useAppLocale();
  const t = <K extends keyof typeof expensesEditorPageDict.sv>(key: K) =>
    tDict(key, locale, expensesEditorPageDict);

  const yearMonth = useBudgetMonthStore((s) => s.selectedYearMonth) ?? "";
  const dashboardMonthQuery = useBudgetDashboardMonthQuery(yearMonth, {
    enabled: !!yearMonth,
  });
  const dashboardAggregate = useMemo(() => {
    if (!dashboardMonthQuery.data) return null;

    return buildDashboardSummaryAggregate(
      dashboardMonthQuery.data,
      locale as AppLocale,
    );
  }, [dashboardMonthQuery.data, locale]);
  const editorQuery = useBudgetMonthEditor(yearMonth || undefined, !!yearMonth);
  const categoriesQuery = useExpenseCategories({ enabled: !!yearMonth });

  const createMutation = useCreateBudgetMonthExpenseItem(yearMonth);
  const patchMutation = usePatchBudgetMonthExpenseItem(yearMonth);
  const deleteMutation = useDeleteBudgetMonthExpenseItem(yearMonth);

  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; row: ExpenseLedgerRowVm }
  >({ open: false });

  if (!yearMonth) {
    return (
      <PageContainer noPadding className="relative">
        <ContentWrapperV2
          size="xl"
          className="relative pt-6 pb-10 sm:pt-8 sm:pb-12"
        >
          <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface p-6 text-sm text-eb-text/60">
            {t("noMonthSelected")}
          </div>
        </ContentWrapperV2>
      </PageContainer>
    );
  }

  const editor = editorQuery.data;
  const categories = categoriesQuery.data ?? [];
  const month = editor?.month ?? null;
  const readOnly = month ? !canEditMonth(month.isEditable, month.status) : true;

  const handleModalSubmit = async (values: CreateExpenseItemApiPayload) => {
    try {
      if (!modalState.open) return;

      if (modalState.mode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("itemCreated"));
      } else {
        await patchMutation.mutateAsync({
          monthExpenseItemId: modalState.row.id,
          payload: {
            ...values,
            updateDefault: false,
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

  const groups = useMemo(() => {
    if (!editor) return [];
    return buildExpenseLedgerGroups({
      editor,
      categories,
      locale,
    });
  }, [editor, categories, locale]);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseLedgerRowVm | null>(
    null,
  );

  const handlePauseToggle = async (row: ExpenseLedgerRowVm) => {
    try {
      await patchMutation.mutateAsync({
        monthExpenseItemId: row.id,
        payload: {
          name: row.name,
          categoryId: row.categoryId,
          amountMonthly: row.amountMonthly,
          isActive: !row.isActive,
          updateDefault: false,
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
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? 0;
  const expenseTotal = dashboardAggregate?.summary.totalExpenditure ?? 0;
  const remainingTotal = dashboardAggregate?.summary.remainingToSpend ?? 0;
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? yearMonth;

  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.40)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.26)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.26)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-6 pb-10 sm:pt-8 sm:pb-12"
      >
        <div className="space-y-4">
          <ExpensesEditorWorkspaceBar
            yearMonthLabel={periodLabel}
            incomeTotal={incomeTotal}
            expenseTotal={expenseTotal}
            remainingTotal={remainingTotal}
            canGoPrevious={false}
            canGoNext={false}
            onGoPrevious={() => {}}
            onGoNext={() => {}}
            onCreate={() => setModalState({ open: true, mode: "create" })}
            readOnly={readOnly}
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
      </ContentWrapperV2>

      <ExpenseItemModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        row={
          modalState.open && modalState.mode === "edit"
            ? {
                id: modalState.row.id,
                name: modalState.row.name,
                categoryId: modalState.row.categoryId,
                amountMonthly: modalState.row.amountMonthly,
                isActive: modalState.row.isActive,
              }
            : null
        }
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
    </PageContainer>
  );
}
