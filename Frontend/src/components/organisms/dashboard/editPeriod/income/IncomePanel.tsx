import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  useBudgetMonthEditor,
  useBudgetMonthIncomeItems,
  useCreateBudgetMonthIncomeItem,
  usePatchBudgetMonthIncomeItemsBulk,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthIncomeItemEditorRowDto,
  BudgetMonthIncomeItemKind,
} from "@/types/budget/BudgetMonthsStatusDto";
import type { CurrencyCode } from "@/types/i18n/currency";
import { useToast } from "@/ui/toast/toast";
import { canEditMonth } from "@/utils/budget/periodEditor/canShowUpdateDefault";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";
import InlineCreateIncomeRow, {
  type InlineCreateIncomePayload,
  type InlineCreateIncomeRowKind,
} from "./InlineCreateIncomeRow";

/**
 * Canonical group render order. Locked by the designer handover and the full
 * income editor: Salary first (the user's dominant income), then Household,
 * then Side income. PR D mirrors the page-level grouping so the drawer feels
 * like a compact version of the same surface.
 */
const GROUP_ORDER: readonly BudgetMonthIncomeItemKind[] = [
  "salary",
  "householdMember",
  "sideHustle",
];

type IncomePanelProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  onClose: () => void;
  /**
   * Whether this panel is the active tab inside the Quick Edit drawer.
   * The panel stays mounted while inactive so drafts survive a tab switch,
   * but its queries are disabled when inactive so we do not pay for refetches
   * the user is not looking at. Defaults to `true` for callers that mount
   * the panel directly (non-tabbed contexts).
   */
  isActive?: boolean;
  /**
   * Dashboard six-term equation for the active month. When provided, the
   * shared footer renders a `free this month → projected` preview for the
   * income tab. Optional so legacy callers fall back to the summary copy.
   */
  dashboardTerms?: DashboardTerms;
  /**
   * Currency for the projection preview. Falls back to the user's app
   * currency when omitted.
   */
  currency?: CurrencyCode;
};

type Draft = {
  amountMonthly: string;
  isActive: boolean;
};

/**
 * Owns all income-edit state for the period editor: row + month queries,
 * grouping, drafts, validation, inline create, and the transactional save.
 *
 * Data shape:
 *   - `useBudgetMonthIncomeItems` is the source of rendered rows.
 *   - `useBudgetMonthEditor` is consulted only for the month meta so we can
 *     resolve `readOnly` defensively. The dashboard normally branches away
 *     from closed/skipped months, but we do not assume that here — same
 *     defense ExpensesPanel uses.
 *
 * Active-tab save contract: this panel saves only the income domain via the
 * existing transactional bulk PATCH. There is no cross-domain save in PR D.
 */
const IncomePanel: React.FC<IncomePanelProps> = ({
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

  const queryEnabled = open && isActive;
  const incomeQuery = useBudgetMonthIncomeItems(yearMonth, queryEnabled);
  // Month meta only — we do not consume `expenseItems` here. The editor
  // query is cached by react-query, so two panels asking for it in one
  // session share the same network round-trip.
  const monthQuery = useBudgetMonthEditor(yearMonth, queryEnabled);
  const bulkMutation = usePatchBudgetMonthIncomeItemsBulk(yearMonth);
  const createMutation = useCreateBudgetMonthIncomeItem(yearMonth);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  // Which non-salary group's inline create form is open, or null when none.
  // Single open form keeps focus unambiguous and matches the ExpensesPanel
  // rule from PR C.
  const [inlineCreateOpenFor, setInlineCreateOpenFor] =
    useState<InlineCreateIncomeRowKind | null>(null);

  const month = monthQuery.data?.month ?? null;
  // Defense in depth: if the editor read hasn't landed yet, treat the panel
  // as read-only so we never expose mutation affordances against unknown
  // month state. Once the meta lands, fall through to the explicit rule.
  const readOnly = month ? !canEditMonth(month.isEditable, month.status) : true;

  // Cross-session reset: closing the drawer wipes drafts and any open
  // create form so the next open seeds entirely from the server. Mirrors
  // ExpensesPanel's PR C behavior — the panel stays mounted across the
  // tab shell's open/close lifecycle, so without an explicit reset Cancel
  // would silently carry drafts across a reopen.
  useEffect(() => {
    if (!open) {
      setDrafts({});
      setInlineCreateOpenFor(null);
    }
  }, [open]);

  // Seed drafts from the server while MERGING any drafts the user has
  // already touched this session. Without the merge, an inline create
  // would invalidate the income query, the refetch would land, and the
  // "replace everything" effect would wipe every unsaved edit. PR D
  // treats that as silent draft-loss (financial bug).
  useEffect(() => {
    if (!open || !incomeQuery.data) return;

    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const row of incomeQuery.data) {
        if (row.isDeleted) continue;
        const existing = prev[row.id];
        if (existing) {
          next[row.id] = existing;
        } else {
          next[row.id] = {
            amountMonthly: String(row.amountMonthly),
            isActive: row.isActive,
          };
        }
      }
      return next;
    });
  }, [incomeQuery.data, open]);

  const rows = useMemo(
    () => (incomeQuery.data ?? []).filter((row) => !row.isDeleted),
    [incomeQuery.data],
  );

  /**
   * Rows grouped by `kind` in fixed render order. Each group reports its
   * label and an "allow add" flag — salary never gets an add affordance
   * because the backend stores one salary row per budget month and the
   * create endpoint's typed payload excludes `kind: "salary"`.
   *
   * Within each group:
   *   - Active rows render first, inactive rows after. Server order is
   *     preserved within each rank (the editor query already returns
   *     salary, then side/household in `SortOrder`).
   */
  const orderedGroups = useMemo(() => {
    const byKind = new Map<BudgetMonthIncomeItemKind, typeof rows>();
    for (const row of rows) {
      const bucket = byKind.get(row.kind) ?? [];
      bucket.push(row);
      byKind.set(row.kind, bucket);
    }

    return GROUP_ORDER.map((kind) => {
      const groupRows = byKind.get(kind) ?? [];

      // Stable sort: active first, then inactive. Use the draft active flag
      // when available so a row the user just toggled doesn't jump under
      // their cursor — the rendered group only re-sorts on the next open.
      // (We deliberately sort by server `isActive` to keep the layout calm
      // across keystrokes; toggling marks the panel dirty but does not
      // shuffle rows. The next reopen seeds from the saved server state
      // and re-sorts honestly.)
      const sorted = [...groupRows].sort((a, b) => {
        if (a.isActive === b.isActive) return 0;
        return a.isActive ? -1 : 1;
      });

      return {
        kind,
        label:
          kind === "salary"
            ? t("incomeGroupSalary")
            : kind === "householdMember"
              ? t("incomeGroupHousehold")
              : t("incomeGroupSide"),
        rows: sorted,
        canAdd: kind !== "salary",
      };
    });
  }, [rows, locale]);

  // Per-row validation. A row is in error when the user touched the amount
  // and the result fails money-input parsing. Inactive rows still validate
  // their amount because the user can toggle them back on with the typed
  // value mid-session; sending an invalid amount would surface the error
  // at save time anyway, so we surface it sooner.
  const draftErrorsByRowId = useMemo(() => {
    return Object.fromEntries(
      rows.map((row) => {
        const draft = drafts[row.id];
        if (!draft) return [row.id, undefined];
        if (draft.amountMonthly === String(row.amountMonthly)) {
          return [row.id, undefined];
        }
        if (draft.amountMonthly.trim() === "") {
          return [row.id, t("amountRequired")];
        }
        const parsed = parseMoneyInput(draft.amountMonthly, {
          allowNegative: false,
          maxDecimals: 2,
        });
        if (parsed === null) {
          return [row.id, t("amountInvalid")];
        }
        return [row.id, undefined];
      }),
    ) as Record<string, string | undefined>;
  }, [rows, drafts, locale]);

  const hasValidationErrors = useMemo(
    () => Object.values(draftErrorsByRowId).some(Boolean),
    [draftErrorsByRowId],
  );

  const changedRows = useMemo(
    () =>
      rows.filter((row) => {
        const draft = drafts[row.id];
        if (!draft) return false;
        const parsed = parseMoneyInput(draft.amountMonthly, {
          allowNegative: false,
          maxDecimals: 2,
        });
        const amountChanged = parsed !== null && parsed !== row.amountMonthly;
        // Salary has no toggle so its `isActive` is constant; for non-salary
        // rows the toggle alone is enough to count as a change.
        const activeChanged = draft.isActive !== row.isActive;
        return amountChanged || activeChanged;
      }),
    [drafts, rows],
  );

  const hasChanges = changedRows.length > 0;

  // Footer projection. Dashboard income SQL counts only `IsActive = 1`, so
  // the projection sums effectively-active rows on both sides:
  //   - baseDomainTotal:  server `row.isActive === true`
  //   - draftDomainTotal: `draft.isActive ?? row.isActive` after the user's
  //                       toggle/amount changes
  // Inactive rows contribute 0 on both sides. This reconciles with the
  // backend dashboard total after save.
  const baseDomainTotal = useMemo(
    () =>
      rows.reduce(
        (sum, row) => sum + (row.isActive ? row.amountMonthly : 0),
        0,
      ),
    [rows],
  );

  const draftDomainTotal = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const draft = drafts[row.id];
        const effectiveActive = draft ? draft.isActive : row.isActive;
        if (!effectiveActive) return sum;
        const parsed =
          draft &&
          parseMoneyInput(draft.amountMonthly, {
            allowNegative: false,
            maxDecimals: 2,
          });
        return sum + (typeof parsed === "number" ? parsed : row.amountMonthly);
      }, 0),
    [rows, drafts],
  );

  const handleAmountChange = (rowId: string, value: string) => {
    setDrafts((prev) => {
      const fallback: Draft = (() => {
        const row = rows.find((r) => r.id === rowId);
        return {
          amountMonthly: row ? String(row.amountMonthly) : "",
          isActive: row?.isActive ?? true,
        };
      })();
      return {
        ...prev,
        [rowId]: {
          ...(prev[rowId] ?? fallback),
          amountMonthly: sanitizeMoneyInput(value),
        },
      };
    });
  };

  const handleActiveToggle = (rowId: string, nextActive: boolean) => {
    setDrafts((prev) => {
      const fallback: Draft = (() => {
        const row = rows.find((r) => r.id === rowId);
        return {
          amountMonthly: row ? String(row.amountMonthly) : "",
          isActive: row?.isActive ?? true,
        };
      })();
      return {
        ...prev,
        [rowId]: {
          ...(prev[rowId] ?? fallback),
          isActive: nextActive,
        },
      };
    });
  };

  const saveAll = async () => {
    if (readOnly) {
      onClose();
      return;
    }
    if (!hasChanges) return;
    if (hasValidationErrors) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    try {
      const payload = changedRows.map((row) => {
        const draft = drafts[row.id] ?? {
          amountMonthly: String(row.amountMonthly),
          isActive: row.isActive,
        };
        const parsed = parseMoneyInput(draft.amountMonthly, {
          allowNegative: false,
          maxDecimals: 2,
        });
        if (parsed === null) throw new Error("Invalid amount.");

        return {
          monthIncomeItemId: row.id,
          payload: {
            // Salary's name column is owned by the backend and cannot be
            // user-edited; sending null keeps the existing salary name. For
            // non-salary rows we preserve the persisted name (rename is not
            // exposed in the quick drawer — same constraint as PR C).
            name: row.kind === "salary" ? null : row.name,
            amountMonthly: parsed,
            // Salary is always active by backend invariant. For non-salary
            // rows we send the draft toggle.
            isActive: row.kind === "salary" ? true : draft.isActive,
            updateDefault: false,
            scope: "currentMonthOnly" as const,
          },
        };
      });

      await bulkMutation.mutateAsync(payload);
      toast.success(t("saveSuccess"));
      onClose();
    } catch (error) {
      toast.error(t("saveErrorGeneric"));
      throw error;
    }
  };

  const handleCreate = (kind: InlineCreateIncomeRowKind) => async (
    payload: InlineCreateIncomePayload,
  ) => {
    if (readOnly) return;

    try {
      await createMutation.mutateAsync({
        kind,
        name: payload.name,
        amountMonthly: payload.amountMonthly,
        isActive: payload.isActive,
        // Inline-created rows are always month-only. The full income editor
        // owns plan-aware add.
        scope: "currentMonthOnly",
      });
      toast.success(t("createSuccess"));
      setInlineCreateOpenFor(null);
    } catch (error) {
      toast.error(t("createErrorGeneric"));
      throw error;
    }
  };

  if (incomeQuery.isLoading || monthQuery.isLoading) {
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

  if (incomeQuery.isError || monthQuery.isError) {
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

  const visibleGroupCount = orderedGroups.filter(
    (g) => g.rows.length > 0 || (!readOnly && g.canAdd),
  ).length;

  return (
    <PanelShell
      body={
        <div className="space-y-4 pb-6">
          {readOnly ? (
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/65">
              {t("monthClosedReadOnly")}
            </div>
          ) : (
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/68">
              {t("incomeMonthOnlyHelper").replace("{month}", periodLabel)}
            </div>
          )}

          {visibleGroupCount === 0 ? (
            <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
              {t("noIncomeItems")}
            </div>
          ) : null}

          {orderedGroups.map((group) => {
            // Hide empty non-salary groups on read-only months: there is no
            // add affordance to act on, so the section would be visual noise.
            // Salary always renders so the layout stays predictable.
            if (
              group.rows.length === 0 &&
              readOnly &&
              group.kind !== "salary"
            ) {
              return null;
            }

            const inlineCreateOpen =
              !readOnly &&
              group.canAdd &&
              inlineCreateOpenFor === group.kind;
            const showAddButton =
              !readOnly &&
              group.canAdd &&
              !inlineCreateOpen &&
              inlineCreateOpenFor === null;

            const emptyCopy =
              group.kind === "salary"
                ? t("incomeNoSalaryYet")
                : group.kind === "householdMember"
                  ? t("incomeNoHouseholdMembers")
                  : t("incomeNoSideIncome");

            return (
              <EditPeriodSection
                key={group.kind}
                title={
                  group.kind === "salary" ? (
                    <span className="inline-flex items-center gap-2">
                      <span>{group.label}</span>
                      <span className="rounded-full bg-[rgb(var(--eb-shell)/0.32)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-eb-text/55">
                        {t("incomeSalaryLockedLabel")}
                      </span>
                    </span>
                  ) : (
                    group.label
                  )
                }
              >
                <div
                  className="space-y-3"
                  data-testid={`income-group-${group.kind}`}
                >
                  {group.rows.length === 0 ? (
                    <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                      {emptyCopy}
                    </div>
                  ) : (
                    group.rows.map((row) => (
                      <IncomeQuickRow
                        key={row.id}
                        row={row}
                        draft={
                          drafts[row.id] ?? {
                            amountMonthly: String(row.amountMonthly),
                            isActive: row.isActive,
                          }
                        }
                        currency={currency}
                        locale={locale}
                        readOnly={readOnly}
                        error={draftErrorsByRowId[row.id]}
                        toggleLabel={t("incomeActiveToggleLabel").replace(
                          "{name}",
                          row.name,
                        )}
                        inactiveHint={t("incomeRowInactiveHint")}
                        onAmountChange={(value) =>
                          handleAmountChange(row.id, value)
                        }
                        onActiveChange={(value) =>
                          handleActiveToggle(row.id, value)
                        }
                      />
                    ))
                  )}

                  {inlineCreateOpen ? (
                    <InlineCreateIncomeRow
                      kind={group.kind as InlineCreateIncomeRowKind}
                      groupLabel={group.label}
                      onCreate={handleCreate(
                        group.kind as InlineCreateIncomeRowKind,
                      )}
                      onCancel={() => setInlineCreateOpenFor(null)}
                      isSaving={createMutation.isPending}
                    />
                  ) : null}

                  {showAddButton ? (
                    <button
                      type="button"
                      onClick={() =>
                        setInlineCreateOpenFor(
                          group.kind as InlineCreateIncomeRowKind,
                        )
                      }
                      data-testid={`income-group-add-${group.kind}`}
                      className="inline-flex items-center gap-2 self-start rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface px-4 py-2 text-sm font-semibold text-eb-text/75 transition hover:border-eb-accent/50 hover:text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
                    >
                      <span aria-hidden="true">+</span>
                      <span>
                        {t("incomeAddToGroup").replace(
                          "{category}",
                          group.label,
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
          onSave={saveAll}
          onOpenPlanning={() => {
            onClose();
            navigate("/dashboard/income");
          }}
          isSaving={bulkMutation.isPending}
          isDisabled={readOnly || !hasChanges || hasValidationErrors}
          summaryText={
            readOnly
              ? t("footerSummaryReadOnly")
              : hasValidationErrors
                ? t("fixValidationErrors")
                : hasChanges
                  ? t("footerSummaryEditable")
                  : t("footerSummaryNoChanges")
          }
          projection={
            dashboardTerms
              ? {
                  terms: dashboardTerms,
                  domain: "income",
                  baseDomainTotal,
                  draftDomainTotal,
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

type IncomeQuickRowProps = {
  row: BudgetMonthIncomeItemEditorRowDto;
  draft: Draft;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
  readOnly: boolean;
  error?: string;
  toggleLabel: string;
  inactiveHint: string;
  onAmountChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
};

/**
 * Single row inside an income group. Salary rows render without an
 * active/inactive toggle (locked by backend invariant); non-salary rows get a
 * checkbox-style toggle whose label is the row name.
 *
 * The amount input stays interactive even when the row is toggled off, so the
 * user can dial in a value before re-activating without losing context.
 * Inactive rows are visually muted and carry an explicit "not counted this
 * month" hint so it's obvious why the projection didn't move.
 */
function IncomeQuickRow({
  row,
  draft,
  currency,
  locale,
  readOnly,
  error,
  toggleLabel,
  inactiveHint,
  onAmountChange,
  onActiveChange,
}: IncomeQuickRowProps) {
  const errorId = error ? `income-row-error-${row.id}` : undefined;
  // Salary never gets a toggle (backend invariant). On read-only months we
  // also hide the toggle entirely — a switch the user cannot actually flip
  // is a fake affordance, and the row's mute treatment plus the closed-month
  // banner already communicate the state.
  const showActiveToggle = row.kind !== "salary" && !readOnly;
  const effectiveActive = draft.isActive;

  return (
    <div
      data-testid={`period-income-row-${row.id}`}
      data-row-kind={row.kind}
      data-row-active={effectiveActive ? "true" : "false"}
      className={`rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3 transition ${
        effectiveActive ? "" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {row.name}
          </div>
          <div className="mt-1 text-xs text-eb-text/55">
            {formatMoneyV2(row.amountMonthly, currency, locale, {
              fractionDigits: 2,
            })}
          </div>
          {showActiveToggle && !effectiveActive ? (
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-eb-text/55">
              {inactiveHint}
            </div>
          ) : null}
        </div>

        {showActiveToggle ? (
          <label className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-eb-text/65">
            <span className="sr-only">{toggleLabel}</span>
            <input
              type="checkbox"
              role="switch"
              aria-label={toggleLabel}
              checked={effectiveActive}
              disabled={readOnly}
              onChange={(event) => onActiveChange(event.target.checked)}
              className="h-4 w-4 rounded border-eb-stroke/40 text-eb-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:opacity-60"
            />
          </label>
        ) : null}
      </div>

      <input
        type="text"
        inputMode="decimal"
        aria-label={row.name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        value={draft.amountMonthly}
        disabled={readOnly}
        onChange={(event) => onAmountChange(event.target.value)}
        className={`mt-3 h-11 w-full rounded-2xl border bg-[rgb(var(--eb-shell)/0.32)] px-4 text-right text-sm font-bold tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 ${
          error
            ? "border-eb-danger/60 focus-visible:ring-eb-danger/25"
            : "border-eb-stroke/30 focus-visible:ring-eb-accent/20"
        }`}
      />
      {error ? (
        <div
          id={errorId}
          className="mt-2 text-xs font-medium text-eb-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function PanelShell({
  body,
  footer,
}: {
  body: React.ReactNode;
  footer: React.ReactNode | null;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        {body}
      </div>
      {footer}
    </>
  );
}

export default IncomePanel;
