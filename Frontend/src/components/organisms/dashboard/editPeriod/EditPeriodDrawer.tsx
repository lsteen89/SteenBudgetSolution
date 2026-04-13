import { useExpenseCategories } from "@/hooks/budget/useExpenseCategories";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { KnownExpenseCategoryCode } from "@/types/budget/ExpenseCategoryDto";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  useBudgetMonthEditor,
  usePatchBudgetMonthExpenseItemsBulk,
} from "@hooks/budget/editPeriod/useMonthEditor";
import React, { useEffect, useMemo, useRef, useState } from "react";
import EditPeriodFooter from "./EditPeriodFooter";
import EditPeriodHeader from "./EditPeriodHeader";
import EditPeriodSection from "./EditPeriodSection";
import PeriodQuickAdjustRow from "./PeriodQuickAdjustRow";

type EditPeriodDrawerProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  periodDateRangeLabel: string;
  onClose: () => void;
};

type ExpenseDraft = {
  amountMonthly: number;
  isActive: boolean;
};

const categoryLabelKeys: Record<
  KnownExpenseCategoryCode,
  keyof typeof editPeriodDrawerDict.sv
> = {
  housing: "categoryHousing",
  food: "categoryFood",
  transport: "categoryTransport",
  clothing: "categoryClothing",
  fixed: "categoryFixedExpense",
  subscription: "categorySubscription",
  other: "categoryOther",
};

const EditPeriodDrawer: React.FC<EditPeriodDrawerProps> = ({
  open,
  yearMonth,
  periodLabel,
  periodDateRangeLabel,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const locale = useAppLocale();
  const currency = useAppCurrency();
  const toast = useToast();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);

  const editorQuery = useBudgetMonthEditor(yearMonth, open);
  const categoriesQuery = useExpenseCategories({ enabled: open });
  const bulkPatchMutation = usePatchBudgetMonthExpenseItemsBulk(yearMonth);

  const [drafts, setDrafts] = useState<Record<string, ExpenseDraft>>({});

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      rootRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const editor = editorQuery.data;
  const month = editor?.month ?? null;
  const readOnly = month ? !canEditMonth(month.isEditable, month.status) : true;
  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    if (!open || !editor?.expenseItems) return;

    const nextDrafts = Object.fromEntries(
      editor.expenseItems
        .filter((x) => !x.isDeleted)
        .map((x) => [
          x.id,
          {
            amountMonthly: x.amountMonthly,
            isActive: x.isActive,
          },
        ]),
    );

    setDrafts(nextDrafts);
  }, [editor, open]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const visibleRows = useMemo(() => {
    return (editor?.expenseItems ?? []).filter((x) => !x.isDeleted);
  }, [editor]);

  const subscriptionCategoryId = useMemo(
    () =>
      categories.find((category) => category.code === "subscription")?.id ??
      null,
    [categories],
  );

  const quickAdjustRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const category = categoriesById.get(row.categoryId);
      if (!category) return false;

      return (
        category.code !== "subscription" &&
        category.code !== "housing" &&
        category.code !== "fixed"
      );
    });
  }, [visibleRows, categoriesById]);

  const subscriptionRows = useMemo(() => {
    if (!subscriptionCategoryId) return [];

    return visibleRows.filter(
      (row) => row.categoryId === subscriptionCategoryId,
    );
  }, [subscriptionCategoryId, visibleRows]);

  const getCategoryLabel = (categoryId: string) => {
    const category = categoriesById.get(categoryId);
    if (!category) return t("categoryOther");

    const translationKey =
      categoryLabelKeys[category.code as KnownExpenseCategoryCode];

    return translationKey ? t(translationKey) : category.name;
  };

  const handleAmountChange = (rowId: string, amountMonthly: number) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? { amountMonthly: 0, isActive: true }),
        amountMonthly,
      },
    }));
  };

  const handleActiveChange = (rowId: string, isActive: boolean) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? { amountMonthly: 0, isActive }),
        isActive,
      },
    }));
  };

  const changedRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const draft = drafts[row.id];
      if (!draft) return false;

      return (
        row.amountMonthly !== draft.amountMonthly ||
        row.isActive !== draft.isActive
      );
    });
  }, [visibleRows, drafts]);

  const hasChanges = changedRows.length > 0;
  const originalEditableTotal = useMemo(() => {
    return [...quickAdjustRows, ...subscriptionRows].reduce((sum, row) => {
      return sum + (row.isActive ? row.amountMonthly : 0);
    }, 0);
  }, [quickAdjustRows, subscriptionRows]);

  const draftEditableTotal = useMemo(() => {
    return [...quickAdjustRows, ...subscriptionRows].reduce((sum, row) => {
      const draft = drafts[row.id] ?? {
        amountMonthly: row.amountMonthly,
        isActive: row.isActive,
      };

      return sum + (draft.isActive ? draft.amountMonthly : 0);
    }, 0);
  }, [quickAdjustRows, subscriptionRows, drafts]);

  const editableDelta = originalEditableTotal - draftEditableTotal;

  const handleSaveAll = async () => {
    if (readOnly || !editor) {
      onClose();
      return;
    }

    if (!hasChanges) {
      return;
    }

    await bulkPatchMutation.mutateAsync(
      changedRows.map((row) => {
        const draft = drafts[row.id];

        return {
          monthExpenseItemId: row.id,
          payload: {
            name: row.name,
            categoryId: row.categoryId,
            amountMonthly: draft.amountMonthly,
            isActive: draft.isActive,
            updateDefault: false,
          },
        };
      }),
    );

    toast.success(t("saveSuccess"));
    onClose();
  };

  const footerSummaryText = useMemo(() => {
    if (readOnly) return t("footerSummaryReadOnly");
    if (!hasChanges) return t("footerSummaryNoChanges");

    const sign = editableDelta >= 0 ? "+" : "−";
    const formattedDelta = formatMoneyV2(
      Math.abs(editableDelta),
      currency,
      locale,
      { fractionDigits: 2 },
    );

    return t("footerSummaryLiveResult")
      .replace("{sign}", sign)
      .replace("{amount}", formattedDelta);
  }, [readOnly, hasChanges, editableDelta, currency, locale, t]);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      aria-hidden={!open}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        "fixed inset-0 z-[80] outline-none transition-all duration-300",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label={t("closePeriodEditor")}
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("editPeriodAriaLabel").replace(
            "{periodLabel}",
            periodLabel,
          )}
          className={cn(
            "pointer-events-auto flex h-full w-full flex-col bg-eb-surface shadow-[0_16px_60px_rgba(21,39,81,0.16)] transition-transform duration-300",
            "sm:max-w-[560px]",
            "rounded-none sm:rounded-l-[2rem]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <EditPeriodHeader
            periodLabel={periodLabel}
            periodDateRangeLabel={periodDateRangeLabel}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {editorQuery.isLoading || categoriesQuery.isLoading ? (
              <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
                {t("loadingEditor")}
              </div>
            ) : editorQuery.isError ? (
              <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
                {t("loadMonthError")}
              </div>
            ) : categoriesQuery.isError ? (
              <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
                {t("loadCategoriesError")}
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {readOnly ? (
                  <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
                    {t("monthClosedReadOnly")}
                  </div>
                ) : null}

                <EditPeriodSection
                  title={t("recurringExpensesTitle")}
                  description={t("recurringExpensesDescription")}
                >
                  <div className="space-y-3">
                    {quickAdjustRows.length === 0 ? (
                      <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                        {t("noEditableExpenses")}
                      </div>
                    ) : (
                      quickAdjustRows.map((row) => {
                        const draft = drafts[row.id] ?? {
                          amountMonthly: row.amountMonthly,
                          isActive: row.isActive,
                        };

                        return (
                          <PeriodQuickAdjustRow
                            key={row.id}
                            row={row}
                            currency={currency}
                            readOnly={readOnly}
                            categoryLabel={getCategoryLabel(row.categoryId)}
                            amountMonthly={draft.amountMonthly}
                            isActive={draft.isActive}
                            showActiveToggle={false}
                            onAmountChange={(value) =>
                              handleAmountChange(row.id, value)
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </EditPeriodSection>

                <EditPeriodSection
                  title={t("subscriptionsTitle")}
                  description={t("subscriptionsDescription")}
                >
                  <div className="space-y-3">
                    {subscriptionRows.length === 0 ? (
                      <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                        {t("noSubscriptions")}
                      </div>
                    ) : (
                      subscriptionRows.map((row) => {
                        const draft = drafts[row.id] ?? {
                          amountMonthly: row.amountMonthly,
                          isActive: row.isActive,
                        };

                        return (
                          <PeriodQuickAdjustRow
                            key={row.id}
                            row={row}
                            currency={currency}
                            readOnly={readOnly}
                            categoryLabel={getCategoryLabel(row.categoryId)}
                            amountMonthly={draft.amountMonthly}
                            isActive={draft.isActive}
                            showActiveToggle
                            onAmountChange={(value) =>
                              handleAmountChange(row.id, value)
                            }
                            onActiveChange={(value) =>
                              handleActiveChange(row.id, value)
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </EditPeriodSection>
              </div>
            )}
          </div>

          <EditPeriodFooter
            onCancel={onClose}
            onSave={handleSaveAll}
            isSaving={bulkPatchMutation.isPending}
            isDisabled={readOnly || !hasChanges}
            summaryText={footerSummaryText}
          />
        </div>
      </div>
    </div>
  );
};

export default EditPeriodDrawer;
