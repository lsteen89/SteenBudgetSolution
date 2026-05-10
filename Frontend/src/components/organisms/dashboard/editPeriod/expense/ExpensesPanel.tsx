import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ZodError } from "zod";

import EditScopeToggle, {
  type EditScope,
} from "@/components/molecules/forms/editScope/EditScopeToggle";
import { useExpenseCategories } from "@/hooks/budget/useExpenseCategories";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  usePatchBudgetMonthExpenseItemsBulk,
  useBudgetMonthEditor,
} from "@hooks/budget/editPeriod/useMonthEditor";
import {
  buildBulkPatchExpenseItemsSchema,
  type ExpenseItemSchemaMessages,
} from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth, canShowUpdateDefault } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";
import PeriodQuickAdjustRow from "../PeriodQuickAdjustRow";

type ExpensesPanelProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  onClose: () => void;
};

type ExpenseDraft = {
  amountMonthly: string;
  isActive: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
};

const countableSubscriptionStatuses = new Set<SubscriptionLifecycleStatus | null>([
  null,
  "active",
]);

/**
 * Owns all expense-edit state for the period editor: query, drafts, scope
 * toggle, validation, and the transactional save. The surrounding drawer
 * shell only handles overlay, header, and esc/close behavior.
 *
 * Splitting this out keeps the drawer small and gives us a clear template to
 * mirror for income / savings / debt panels in subsequent PRs.
 */
const ExpensesPanel: React.FC<ExpensesPanelProps> = ({
  open,
  yearMonth,
  periodLabel,
  onClose,
}) => {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const toast = useToast();
  const navigate = useNavigate();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const tSchema = <K extends keyof typeof expenseItemSchemaDict.sv>(key: K) =>
    tDict(key, locale, expenseItemSchemaDict);

  const editorQuery = useBudgetMonthEditor(yearMonth, open);
  const categoriesQuery = useExpenseCategories({ enabled: open });
  const bulkPatchMutation = usePatchBudgetMonthExpenseItemsBulk(yearMonth);

  const [drafts, setDrafts] = useState<Record<string, ExpenseDraft>>({});
  const [scope, setScope] = useState<EditScope>("month");

  const schemaMessages = useMemo<ExpenseItemSchemaMessages>(
    () => ({
      invalidId: tSchema("invalidId"),
      nameRequired: tSchema("nameRequired"),
      nameTooLong: tSchema("nameTooLong"),
      categoryRequired: tSchema("categoryRequired"),
      amountRequired: tSchema("amountRequired"),
      amountInvalid: tSchema("amountInvalid"),
      amountNegative: tSchema("amountNegative"),
      atLeastOneItem: tSchema("atLeastOneItem"),
    }),
    [locale],
  );
  const bulkPatchExpenseItemsSchema = useMemo(
    () => buildBulkPatchExpenseItemsSchema(schemaMessages),
    [schemaMessages],
  );

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
            amountMonthly: String(x.amountMonthly),
            isActive: x.isActive,
            subscriptionLifecycleStatus: x.subscriptionLifecycleStatus,
          },
        ]),
    );

    setDrafts(nextDrafts);
    setScope("month"); // each open of the panel resets the scope toggle
  }, [editor, open]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const visibleRows = useMemo(
    () => (editor?.expenseItems ?? []).filter((x) => !x.isDeleted),
    [editor],
  );

  const quickAdjustRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const category = categoriesById.get(row.categoryId);
      if (!category) return false;
      const categoryKey = asCategoryKey(category.code);
      return (
        categoryKey !== "subscription" &&
        categoryKey !== "housing" &&
        categoryKey !== "fixed"
      );
    });
  }, [visibleRows, categoriesById]);

  const subscriptionRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const category = categoriesById.get(row.categoryId);
      if (!category) return false;
      return asCategoryKey(category.code) === "subscription";
    });
  }, [visibleRows, categoriesById]);

  const getCategoryLabel = (categoryId: string) => {
    const category = categoriesById.get(categoryId);
    if (!category) return labelCategory("other", locale);
    return labelCategory(asCategoryKey(category.code), locale);
  };

  const handleAmountChange = (rowId: string, amountMonthly: string) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          amountMonthly: "",
          isActive: true,
          subscriptionLifecycleStatus: null,
        }),
        amountMonthly,
      },
    }));
  };

  const handleSubscriptionLifecycleChange = (
    rowId: string,
    subscriptionLifecycleStatus: SubscriptionLifecycleStatus,
    fallbackAmount: number,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {
          amountMonthly: String(fallbackAmount),
          isActive: true,
          subscriptionLifecycleStatus: "active",
        }),
        amountMonthly: String(fallbackAmount),
        isActive: true,
        subscriptionLifecycleStatus,
      },
    }));
  };

  const hasActiveToggleForRow = React.useCallback(
    (row: (typeof visibleRows)[number]) => {
      const category = categoriesById.get(row.categoryId);
      if (!category) return false;
      return asCategoryKey(category.code) === "subscription";
    },
    [categoriesById],
  );

  const getDraftAmountError = React.useCallback(
    (value: string): string | undefined => {
      if (value.trim() === "") {
        return t("amountRequired");
      }

      const parsed = parseMoneyInput(value, {
        allowNegative: false,
        maxDecimals: 2,
      });

      if (parsed === null) {
        return t("amountInvalid");
      }

      return undefined;
    },
    [t],
  );

  const draftErrorsByRowId = useMemo(() => {
    return Object.fromEntries(
      visibleRows.map((row) => {
        const draft = drafts[row.id] ?? {
          amountMonthly: String(row.amountMonthly),
          isActive: row.isActive,
          subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
        };

        const disabledByInactiveToggle =
          hasActiveToggleForRow(row) && !draft.isActive;
        const disabledByLifecycle =
          hasActiveToggleForRow(row) &&
          !countableSubscriptionStatuses.has(draft.subscriptionLifecycleStatus);

        if (disabledByInactiveToggle || disabledByLifecycle) {
          return [row.id, undefined];
        }

        return [row.id, getDraftAmountError(draft.amountMonthly)];
      }),
    ) as Record<string, string | undefined>;
  }, [visibleRows, drafts, getDraftAmountError, hasActiveToggleForRow]);

  const hasValidationErrors = useMemo(
    () => Object.values(draftErrorsByRowId).some(Boolean),
    [draftErrorsByRowId],
  );

  const changedRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const draft = drafts[row.id];
      if (!draft) return false;

      const parsedDraftAmount = parseMoneyInput(draft.amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      });

      if (parsedDraftAmount === null) return true;

      return (
        row.amountMonthly !== parsedDraftAmount ||
        row.isActive !== draft.isActive ||
        row.subscriptionLifecycleStatus !== draft.subscriptionLifecycleStatus
      );
    });
  }, [visibleRows, drafts]);

  const hasChanges = changedRows.length > 0;

  // The scope toggle's "plan" option is only meaningful when at least one
  // changed row is baseline-backed. Pure month-only edits (a one-off cost the
  // user added inline) cannot update the plan because there is no plan row.
  const anyChangedRowCanUpdatePlan = useMemo(
    () => changedRows.some((row) => canShowUpdateDefault(row)),
    [changedRows],
  );

  const planScopeDisabledHint = anyChangedRowCanUpdatePlan
    ? undefined
    : t("scopePlanDisabledHint");

  const originalEditableTotal = useMemo(() => {
    return [...quickAdjustRows, ...subscriptionRows].reduce((sum, row) => {
      const countsForMonth =
        row.isActive &&
        countableSubscriptionStatuses.has(row.subscriptionLifecycleStatus);
      return sum + (countsForMonth ? row.amountMonthly : 0);
    }, 0);
  }, [quickAdjustRows, subscriptionRows]);

  const draftEditableTotal = useMemo(() => {
    return [...quickAdjustRows, ...subscriptionRows].reduce((sum, row) => {
      const draft = drafts[row.id] ?? {
        amountMonthly: String(row.amountMonthly),
        isActive: row.isActive,
        subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
      };

      const parsedAmount =
        parseMoneyInput(draft.amountMonthly, {
          allowNegative: false,
          maxDecimals: 2,
        }) ?? 0;

      const countsForMonth =
        draft.isActive &&
        countableSubscriptionStatuses.has(draft.subscriptionLifecycleStatus);

      return sum + (countsForMonth ? parsedAmount : 0);
    }, 0);
  }, [quickAdjustRows, subscriptionRows, drafts]);

  const editableDelta = originalEditableTotal - draftEditableTotal;

  const handleSaveAll = async () => {
    if (readOnly || !editor) {
      onClose();
      return;
    }

    if (!hasChanges) return;

    if (hasValidationErrors) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    try {
      const wantsPlanScope = scope === "plan";

      const rawPayload = changedRows.map((row) => {
        const draft = drafts[row.id] ?? {
          amountMonthly: String(row.amountMonthly),
          isActive: row.isActive,
          subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
        };

        // "Plan" scope only propagates to baseline rows that exist; month-only
        // rows always patch with updateDefault=false because the backend
        // (correctly) rejects updateDefault=true for rows without a baseline.
        const updateDefault = wantsPlanScope && canShowUpdateDefault(row);

        return {
          monthExpenseItemId: row.id,
          payload: {
            name: row.name,
            categoryId: row.categoryId,
            amountMonthly: draft.amountMonthly,
            isActive: draft.isActive,
            subscriptionLifecycleStatus: draft.subscriptionLifecycleStatus,
            updateDefault,
          },
        };
      });

      const payload = bulkPatchExpenseItemsSchema.parse(rawPayload);

      await bulkPatchMutation.mutateAsync(payload);

      toast.success(t("saveSuccess"));
      onClose();
    } catch (error) {
      if (error instanceof ZodError) {
        toast.error(t("fixValidationErrors"));
        return;
      }

      // Real bulk endpoint failures surface as a single error: there is no
      // partial success to communicate, so a single user-facing message is
      // honest. We still rethrow so the dev console captures the cause.
      toast.error(t("saveErrorGeneric"));
      throw error;
    }
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

  const isSaving = bulkPatchMutation.isPending;

  if (editorQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <PanelShell
        body={
          <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
            {t("loadingEditor")}
          </div>
        }
        footer={null}
      />
    );
  }

  if (editorQuery.isError) {
    return (
      <PanelShell
        body={
          <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
            {t("loadMonthError")}
          </div>
        }
        footer={null}
      />
    );
  }

  if (categoriesQuery.isError) {
    return (
      <PanelShell
        body={
          <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
            {t("loadCategoriesError")}
          </div>
        }
        footer={null}
      />
    );
  }

  return (
    <PanelShell
      body={
        <div className="space-y-4 pb-6">
          {readOnly ? (
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
              {t("monthClosedReadOnly")}
            </div>
          ) : null}

          {!readOnly ? (
            <EditScopeToggle
              value={scope}
              onChange={setScope}
              monthLabel={periodLabel}
              canUpdatePlan={anyChangedRowCanUpdatePlan}
              disabledPlanHint={planScopeDisabledHint}
              disabled={isSaving}
              testId="expenses-panel-scope-toggle"
            />
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
                    amountMonthly: String(row.amountMonthly),
                    isActive: row.isActive,
                    subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
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
                      error={draftErrorsByRowId[row.id]}
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
                    amountMonthly: String(row.amountMonthly),
                    isActive: row.isActive,
                    subscriptionLifecycleStatus:
                      row.subscriptionLifecycleStatus ?? "active",
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
                      showLifecycleControl
                      subscriptionLifecycleStatus={
                        draft.subscriptionLifecycleStatus ?? "active"
                      }
                      onAmountChange={(value) =>
                        handleAmountChange(row.id, value)
                      }
                      onSubscriptionLifecycleChange={(value) =>
                        handleSubscriptionLifecycleChange(
                          row.id,
                          value,
                          row.amountMonthly,
                        )
                      }
                      error={draftErrorsByRowId[row.id]}
                    />
                  );
                })
              )}
            </div>
          </EditPeriodSection>
        </div>
      }
      footer={
        <EditPeriodFooter
          onCancel={onClose}
          onSave={handleSaveAll}
          onOpenPlanning={() => {
            onClose();
            navigate("/dashboard/expenses");
          }}
          isSaving={isSaving}
          isDisabled={readOnly || !hasChanges || hasValidationErrors}
          summaryText={footerSummaryText}
        />
      }
    />
  );
};

type PanelShellProps = {
  body: React.ReactNode;
  footer: React.ReactNode | null;
};

/**
 * Splits the scrollable body from the sticky footer so the panel keeps the
 * same visual rhythm in loading / error / loaded states.
 */
const PanelShell: React.FC<PanelShellProps> = ({ body, footer }) => (
  <>
    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      {body}
    </div>
    {footer}
  </>
);

export default ExpensesPanel;
