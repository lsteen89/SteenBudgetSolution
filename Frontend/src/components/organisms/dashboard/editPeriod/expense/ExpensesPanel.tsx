import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ZodError } from "zod";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import { useExpenseCategories } from "@/hooks/budget/useExpenseCategories";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  useCreateBudgetMonthExpenseItem,
  usePatchBudgetMonthExpenseItemsBulk,
  useBudgetMonthEditor,
} from "@hooks/budget/editPeriod/useMonthEditor";
import {
  buildBulkPatchExpenseItemsSchema,
  type CreateExpenseItemApiPayload,
  type ExpenseItemSchemaMessages,
} from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import type { SubscriptionLifecycleStatus } from "@/types/budget/BudgetMonthsStatusDto";
import type { KnownExpenseCategoryCode } from "@/types/budget/categoryKeys";
import type { CurrencyCode } from "@/types/i18n/currency";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";
import PeriodQuickAdjustRow from "../PeriodQuickAdjustRow";
import InlineCreateExpenseRow from "./InlineCreateExpenseRow";

/**
 * Canonical render order for the Quick Edit expense groups. Surface-only
 * concern: categories the user sees first should match how their household
 * thinks about expenses (roof → essentials → variable → recurring).
 * `other` is rendered last because it is the catch-all bucket. Unknown
 * category codes still render — they slot in at the end after `other`.
 */
const CATEGORY_RENDER_ORDER: readonly KnownExpenseCategoryCode[] = [
  "housing",
  "fixed",
  "food",
  "transport",
  "clothing",
  "subscription",
  "other",
];

type ExpensesPanelProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  onClose: () => void;
  /**
   * Whether this panel is the active tab inside the Quick Edit drawer.
   * Drafts persist across tab switches because the panel stays mounted;
   * the query is disabled when inactive so we do not refetch behind a
   * hidden tab. Defaults to `true` for non-tabbed callers.
   */
  isActive?: boolean;
  /**
   * Dashboard six-term equation for the active month. Used by the shared
   * footer to render `free this month → projected` for the active tab.
   * Optional so non-drawer callers keep working with the legacy summary copy.
   */
  dashboardTerms?: DashboardTerms;
  /**
   * Currency for the projection preview. Required when `dashboardTerms` is
   * provided; falls back to the user's app currency otherwise.
   */
  currency?: CurrencyCode;
};

type ExpenseDraft = {
  amountMonthly: string;
  isActive: boolean;
  subscriptionLifecycleStatus: SubscriptionLifecycleStatus | null;
};

// Subscription lifecycle → counts toward this month's expense total:
//   active     → counts (regular monthly charge)
//   cancelled  → counts (last charge happens this month)
//   paused     → excluded (no charge this month)
//   any other  → excluded (defense-in-depth against future statuses
//                landing in the column without a deliberate code change)
// Non-subscription rows carry `null` and always count when active+not-deleted.
// Backend dashboard SQL applies the same rule (BudgetMonthDashboardRepository
// uses an explicit allowlist:
// `IS NULL OR IN (@ActiveSubscriptionLifecycleStatus, @CancelledSubscriptionLifecycleStatus)`),
// so the footer's "free this month" projection reconciles with what the
// dashboard will show after save.
const countableSubscriptionStatuses = new Set<SubscriptionLifecycleStatus | null>([
  null,
  "active",
  "cancelled",
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
  isActive = true,
  dashboardTerms,
  currency: currencyProp,
}) => {
  const locale = useAppLocale();
  const fallbackCurrency = useAppCurrency();
  const currency = currencyProp ?? fallbackCurrency;
  const toast = useToast();
  const navigate = useNavigate();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const tSchema = <K extends keyof typeof expenseItemSchemaDict.sv>(key: K) =>
    tDict(key, locale, expenseItemSchemaDict);

  const queryEnabled = open && isActive;
  const editorQuery = useBudgetMonthEditor(yearMonth, queryEnabled);
  const categoriesQuery = useExpenseCategories({ enabled: queryEnabled });
  const bulkPatchMutation = usePatchBudgetMonthExpenseItemsBulk(yearMonth);
  const createMutation = useCreateBudgetMonthExpenseItem(yearMonth);

  const [drafts, setDrafts] = useState<Record<string, ExpenseDraft>>({});
  // The category id whose inline create form is currently expanded, or null
  // when no create form is open. Only one create form open at a time keeps
  // the drawer calm and avoids ambiguous focus between multiple draft rows.
  const [inlineCreateOpenFor, setInlineCreateOpenFor] = useState<string | null>(
    null,
  );

  // Closing the drawer resets every in-flight piece of UI state so the next
  // open starts from the server's source of truth. ExpensesPanel stays
  // mounted across open/close in the Quick Edit tab shell (kept mounted to
  // preserve drafts across tab switches inside an open session); without
  // this hard reset, Cancel would silently keep the user's unsaved drafts
  // alive across a reopen.
  //
  // Resets on close:
  //   - `drafts` → {} so the next open seeds entirely from the server
  //   - `inlineCreateOpenFor` → null so the create form does not flash on
  //     reopen before the seed effect runs
  useEffect(() => {
    if (!open) {
      setDrafts({});
      setInlineCreateOpenFor(null);
    }
  }, [open]);

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

  // Seed drafts from the server, but MERGE with any drafts the user has
  // already touched in THIS open session.
  //
  // Cross-session reset happens in the `open=false` effect above, which
  // clears `drafts` entirely. So when this effect fires on a fresh open,
  // `prev` is already `{}` and every row is seeded from the server.
  //
  // During an open session the effect can fire again — most importantly
  // after an inline create invalidates the editor query and a refetch
  // lands a new row set. The previous "replace everything" implementation
  // wiped every unsaved edit the user had typed into other rows the
  // moment they added a new expense. That is silent draft-loss; we treat
  // it as a financial bug.
  //
  // Merge rules (in-session refetch):
  //   - Row id exists in current drafts → KEEP the user's draft as-is. Their
  //     edits are authoritative until they save or cancel the drawer.
  //   - Row id is new → seed from the server row's persisted values.
  //   - Draft id no longer present in server rows → drop it (defensive; PR C
  //     does not delete rows from this panel, but a sibling tab or full
  //     editor could remove a row mid-session and we should not carry a
  //     ghost draft against a missing id).
  useEffect(() => {
    if (!open || !editor?.expenseItems) return;

    setDrafts((prev) => {
      const next: Record<string, ExpenseDraft> = {};

      for (const row of editor.expenseItems) {
        if (row.isDeleted) continue;
        const existing = prev[row.id];
        if (existing) {
          next[row.id] = existing;
        } else {
          next[row.id] = {
            amountMonthly: String(row.amountMonthly),
            isActive: row.isActive,
            subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
          };
        }
      }

      return next;
    });
  }, [editor, open]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const visibleRows = useMemo(
    () => (editor?.expenseItems ?? []).filter((x) => !x.isDeleted),
    [editor],
  );

  /**
   * Rows grouped by category, in `CATEGORY_RENDER_ORDER`. Each entry carries
   * the resolved category and its rows. Categories with zero rows are still
   * included when editable, so the user has somewhere to click "Add to {category}"
   * — except for closed/skipped months, where empty groups are hidden because
   * we never offer add affordances on a read-only month.
   *
   * Rows whose `categoryId` does not resolve to a known category fall into a
   * synthetic "unknown" bucket appended after the canonical order. This is
   * defensive — backend should always return a matching category — but
   * silently dropping rows would understate the dashboard total.
   */
  const orderedCategoryGroups = useMemo(() => {
    const rowsByCategoryId = new Map<
      string,
      (typeof visibleRows)[number][]
    >();
    const unknownRows: (typeof visibleRows)[number][] = [];

    for (const row of visibleRows) {
      const category = categoriesById.get(row.categoryId);
      if (!category) {
        unknownRows.push(row);
        continue;
      }
      const bucket = rowsByCategoryId.get(category.id) ?? [];
      bucket.push(row);
      rowsByCategoryId.set(category.id, bucket);
    }

    // First pass: canonical-order groups for known category codes.
    const groups: Array<{
      categoryId: string;
      categoryCode: KnownExpenseCategoryCode;
      categoryLabel: string;
      rows: (typeof visibleRows)[number][];
    }> = [];

    const seenCategoryIds = new Set<string>();

    for (const code of CATEGORY_RENDER_ORDER) {
      // There can be more than one persisted category row per code in
      // theory (e.g. mislabeled seed data); take the first by id stability.
      const category = categories.find((c) => asCategoryKey(c.code) === code);
      if (!category) continue;

      const rows = rowsByCategoryId.get(category.id) ?? [];
      seenCategoryIds.add(category.id);

      // Hide empty groups on read-only months — there is no add affordance
      // for the user to act on, so an empty section is pure visual noise.
      if (rows.length === 0 && readOnly) continue;

      groups.push({
        categoryId: category.id,
        categoryCode: code,
        categoryLabel: labelCategory(code, locale),
        rows,
      });
    }

    // Second pass: categories the backend returned that are not in our
    // canonical render order (future-proof for new codes).
    for (const category of categories) {
      if (seenCategoryIds.has(category.id)) continue;
      const rows = rowsByCategoryId.get(category.id) ?? [];
      if (rows.length === 0) continue;
      groups.push({
        categoryId: category.id,
        categoryCode: asCategoryKey(category.code),
        categoryLabel: labelCategory(asCategoryKey(category.code), locale),
        rows,
      });
    }

    // Third pass: rows with no resolvable category — surface them so the
    // dashboard total still reconciles, but no add affordance.
    if (unknownRows.length > 0) {
      groups.push({
        categoryId: "__unknown__",
        categoryCode: "other",
        categoryLabel: labelCategory("other", locale),
        rows: unknownRows,
      });
    }

    return groups;
  }, [visibleRows, categoriesById, categories, locale, readOnly]);

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
    setDrafts((prev) => {
      const existing = prev[rowId];
      // Preserve whatever amount is in the draft. The previous version
      // overwrote `amountMonthly` with the row's persisted value on every
      // lifecycle change, silently throwing away a user-typed last-charge
      // amount when they flipped the row to "cancelled". The amount is
      // only seeded from `fallbackAmount` when no draft exists yet.
      const amountMonthly = existing
        ? existing.amountMonthly
        : String(fallbackAmount);

      return {
        ...prev,
        [rowId]: {
          amountMonthly,
          isActive: true,
          subscriptionLifecycleStatus,
        },
      };
    });
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

  // Totals sum every visible row (housing, fixed, subscriptions, variable)
  // since all expense categories now participate in the Quick Edit drawer.
  // The "this row counts" rule matches the backend dashboard SQL:
  // active+not-deleted plus lifecycle in {null, active, cancelled}.
  const originalEditableTotal = useMemo(() => {
    return visibleRows.reduce((sum, row) => {
      const countsForMonth =
        row.isActive &&
        countableSubscriptionStatuses.has(row.subscriptionLifecycleStatus);
      return sum + (countsForMonth ? row.amountMonthly : 0);
    }, 0);
  }, [visibleRows]);

  const draftEditableTotal = useMemo(() => {
    return visibleRows.reduce((sum, row) => {
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
  }, [visibleRows, drafts]);

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
      const rawPayload = changedRows.map((row) => {
        const draft = drafts[row.id] ?? {
          amountMonthly: String(row.amountMonthly),
          isActive: row.isActive,
          subscriptionLifecycleStatus: row.subscriptionLifecycleStatus,
        };

        return {
          monthExpenseItemId: row.id,
          payload: {
            name: row.name,
            categoryId: row.categoryId,
            amountMonthly: draft.amountMonthly,
            isActive: draft.isActive,
            subscriptionLifecycleStatus: draft.subscriptionLifecycleStatus,
            updateDefault: false,
            scope: "currentMonthOnly" as const,
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

  /**
   * Inline create handler — month-only row, no plan write. Pinned to the
   * group's category id by the parent (`InlineCreateExpenseRow` cannot
   * change it). Closes the form on success and lets the mutation hook's
   * invalidation refresh the editor rows; the new row will then appear in
   * its group via the normal grouping pass.
   *
   * Note: drafts in the bulk-edit area are intentionally NOT reset here.
   * The user may have unsaved edits to other rows; clearing their drafts
   * would silently drop work. The newly-created row simply joins the list
   * with its baseline values.
   */
  const handleCreateForCategory = (categoryId: string) => async (
    payload: CreateExpenseItemApiPayload,
  ) => {
    if (readOnly) return;

    // Defensive: the form should already pin this value, but if a future
    // change loosens that, we want the wire payload to reflect the group
    // the user actually clicked under.
    const pinnedPayload = { ...payload, categoryId };

    try {
      await createMutation.mutateAsync(pinnedPayload);
      toast.success(t("createSuccess"));
      setInlineCreateOpenFor(null);
    } catch (error) {
      toast.error(t("createErrorGeneric"));
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
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/68">
              {t("monthOnlyHelper").replace("{month}", periodLabel)}
            </div>
          ) : null}

          {orderedCategoryGroups.length === 0 ? (
            <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
              {t("noEditableExpenses")}
            </div>
          ) : null}

          {orderedCategoryGroups.map((group) => {
            const isSubscriptionGroup = group.categoryCode === "subscription";
            const hasInlineCreateOpen =
              inlineCreateOpenFor === group.categoryId;
            const isUnknownBucket = group.categoryId === "__unknown__";

            return (
              <EditPeriodSection
                key={group.categoryId}
                title={group.categoryLabel}
              >
                <div
                  className="space-y-3"
                  data-testid={`expense-group-${group.categoryCode}`}
                >
                  {group.rows.length === 0 ? (
                    <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                      {isSubscriptionGroup
                        ? t("noSubscriptions")
                        : t("noEditableExpenses")}
                    </div>
                  ) : (
                    group.rows.map((row) => {
                      const draft = drafts[row.id] ?? {
                        amountMonthly: String(row.amountMonthly),
                        isActive: row.isActive,
                        subscriptionLifecycleStatus: isSubscriptionGroup
                          ? row.subscriptionLifecycleStatus ?? "active"
                          : row.subscriptionLifecycleStatus,
                      };

                      return (
                        <PeriodQuickAdjustRow
                          key={row.id}
                          row={row}
                          currency={currency}
                          readOnly={readOnly}
                          categoryLabel={group.categoryLabel}
                          amountMonthly={draft.amountMonthly}
                          isActive={draft.isActive}
                          showActiveToggle={false}
                          showLifecycleControl={isSubscriptionGroup}
                          subscriptionLifecycleStatus={
                            isSubscriptionGroup
                              ? draft.subscriptionLifecycleStatus ?? "active"
                              : undefined
                          }
                          onAmountChange={(value) =>
                            handleAmountChange(row.id, value)
                          }
                          onSubscriptionLifecycleChange={
                            isSubscriptionGroup
                              ? (value) =>
                                  handleSubscriptionLifecycleChange(
                                    row.id,
                                    value,
                                    row.amountMonthly,
                                  )
                              : undefined
                          }
                          error={draftErrorsByRowId[row.id]}
                        />
                      );
                    })
                  )}

                  {/* Inline create: only when this group's form is open. */}
                  {hasInlineCreateOpen ? (
                    <InlineCreateExpenseRow
                      categoryId={group.categoryId}
                      categoryLabel={group.categoryLabel}
                      isSubscriptionCategory={isSubscriptionGroup}
                      onCreate={handleCreateForCategory(group.categoryId)}
                      onCancel={() => setInlineCreateOpenFor(null)}
                      isSaving={createMutation.isPending}
                    />
                  ) : null}

                  {/* Add affordance: hidden on read-only months and on the
                      synthetic "unknown" bucket (no real category id to
                      write against). Also hidden while another group's
                      form is open, to keep one create flow at a time. */}
                  {!readOnly &&
                  !hasInlineCreateOpen &&
                  inlineCreateOpenFor === null &&
                  !isUnknownBucket ? (
                    <button
                      type="button"
                      onClick={() => setInlineCreateOpenFor(group.categoryId)}
                      data-testid={`expense-group-add-${group.categoryCode}`}
                      className="inline-flex items-center gap-2 self-start rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface px-4 py-2 text-sm font-semibold text-eb-text/75 transition hover:border-eb-accent/50 hover:text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
                    >
                      <span aria-hidden="true">+</span>
                      <span>
                        {t("addExpenseToGroup").replace(
                          "{category}",
                          group.categoryLabel,
                        )}
                      </span>
                    </button>
                  ) : null}
                </div>
              </EditPeriodSection>
            );
          })}
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
          projection={
            dashboardTerms
              ? {
                  terms: dashboardTerms,
                  domain: "expenses",
                  baseDomainTotal: originalEditableTotal,
                  draftDomainTotal: draftEditableTotal,
                  currency,
                  hasChanges,
                  hasValidationErrors,
                  readOnly,
                }
              : undefined
          }
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
