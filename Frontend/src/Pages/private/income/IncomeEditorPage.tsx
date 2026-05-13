import BudgetEditorPageShell from "@/components/molecules/forms/budgetEditor/BudgetEditorPageShell";
import BudgetEditorWorkspaceBar from "@/components/molecules/forms/budgetEditor/BudgetEditorWorkspaceBar";
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
import IncomeItemModal from "./components/IncomeItemModal";
import IncomeLedgerSection from "./components/IncomeLedgerSection";

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
  const total = rows.reduce(
    (sum, row) => sum + (row.isActive ? row.amountMonthly : 0),
    0,
  );
  const periodLabel =
    dashboardAggregate?.summary.header.periodLabel ?? editableYearMonth ?? "";
  const incomeTotal = dashboardAggregate?.summary.totalIncome ?? total;
  const expenseTotal = dashboardAggregate?.summary.totalExpenditure ?? 0;
  const remainingTotal =
    dashboardAggregate?.summary.remainingToSpend ?? incomeTotal - expenseTotal;

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

  return (
    <>
      <BudgetEditorPageShell>
        <div className="space-y-4">
          <BudgetEditorWorkspaceBar
            eyebrow={t("eyebrow")}
            title={t("titleWithMonth").replace("{yearMonthLabel}", periodLabel)}
            description={t("description").replace(
              "{yearMonthLabel}",
              periodLabel,
            )}
            readOnlyBadge={t("readOnlyBadge")}
            createLabel={t("create")}
            periodLabel={periodLabel}
            periodCaption={t("period")}
            readOnly={readOnly}
            onCreate={() => setModalState({ open: true, mode: "create" })}
            metrics={[
              {
                label: t("income"),
                amount: incomeTotal,
              },
              {
                prefix: "−",
                label: t("expenses"),
                amount: expenseTotal,
              },
              {
                prefix: "=",
                label: t("remaining"),
                amount: remainingTotal,
                tone: remainingTotal < 0 ? "danger" : "accent",
              },
            ]}
          />

          <div className="space-y-4">
            {incomeQuery.isLoading || dashboardMonthQuery.isLoading ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadingIncome")}
              </div>
            ) : incomeQuery.isError ? (
              <div className="rounded-[1.75rem] border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.18)] p-6 text-sm text-eb-text/60 backdrop-blur-[6px]">
                {t("loadEditorError")}
              </div>
            ) : (
              <IncomeLedgerSection
                rows={rows}
                total={total}
                readOnly={readOnly}
                onEdit={(row) => setModalState({ open: true, mode: "edit", row })}
                onDelete={handleDelete}
              />
            )}
          </div>
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
