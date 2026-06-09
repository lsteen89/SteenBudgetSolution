import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  useBudgetMonthSavingsGoals,
  usePatchBudgetMonthBaseSavings,
  usePatchBudgetMonthSavingsGoalsBulk,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { CurrencyCode } from "@/types/i18n/currency";
import { useToast } from "@/ui/toast/toast";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";

type SavingsPanelProps = {
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
   * Dashboard six-term equation for the active month. When provided, the
   * shared footer renders a `free this month → projected` preview for the
   * savings tab. Optional so legacy callers fall back to the summary copy.
   */
  dashboardTerms?: DashboardTerms;
  /**
   * Currency for the projection preview. Falls back to the user's app
   * currency when omitted.
   */
  currency?: CurrencyCode;
  /**
   * Dashboard-backed base savings term. When provided, the panel renders the
   * base savings row and widens the footer projection to reconcile
   * `base savings + goal contributions`.
   */
  dashboardSavings?: {
    baseSavingsMonthly: number;
    isMonthOnly: boolean;
    readOnly: boolean;
  };
};

type Draft = {
  monthlyContribution: string;
};

const SavingsPanel: React.FC<SavingsPanelProps> = ({
  open,
  yearMonth,
  periodLabel,
  onClose,
  isActive = true,
  dashboardTerms,
  currency: currencyProp,
  dashboardSavings,
}) => {
  const locale = useAppLocale();
  const fallbackCurrency = useAppCurrency();
  const currency = currencyProp ?? fallbackCurrency;
  const toast = useToast();
  const navigate = useNavigate();
  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const queryEnabled = open && isActive;
  const query = useBudgetMonthSavingsGoals(yearMonth, queryEnabled);
  const baseSavingsMutation = usePatchBudgetMonthBaseSavings(yearMonth);
  const bulkMutation = usePatchBudgetMonthSavingsGoalsBulk(yearMonth);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [baseSavingsDraft, setBaseSavingsDraft] = useState(() =>
    dashboardSavings ? String(dashboardSavings.baseSavingsMonthly) : "",
  );
  const seededBaseSavingsRef = useRef<number | null>(
    dashboardSavings?.baseSavingsMonthly ?? null,
  );

  const readOnly = dashboardSavings?.readOnly ?? false;

  useEffect(() => {
    if (open) return;
    setDrafts({});
    setBaseSavingsDraft("");
    seededBaseSavingsRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open || !query.data) return;
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const row of query.data) {
        if (row.isDeleted || row.status === "closed") continue;
        next[row.id] = prev[row.id] ?? {
          monthlyContribution: String(row.monthlyContribution),
        };
      }
      return next;
    });
  }, [open, query.data]);

  const baseSavingsServer = dashboardSavings?.baseSavingsMonthly ?? 0;
  const hasDashboardSavings = dashboardSavings !== undefined;

  useEffect(() => {
    if (!open || !dashboardSavings) return;
    if (seededBaseSavingsRef.current === baseSavingsServer) return;
    setBaseSavingsDraft(String(baseSavingsServer));
    seededBaseSavingsRef.current = baseSavingsServer;
  }, [baseSavingsServer, dashboardSavings, open]);

  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (row) => !row.isDeleted && row.status !== "closed",
      ),
    [query.data],
  );

  const changedRows = useMemo(
    () =>
      rows.filter((row) => {
        const draft = drafts[row.id];
        if (!draft) return false;
        const parsed = parseMoneyInput(draft.monthlyContribution, {
          allowNegative: false,
          maxDecimals: 2,
        });
        return parsed !== row.monthlyContribution;
      }),
    [drafts, rows],
  );

  const hasGoalChanges = changedRows.length > 0;

  // Per-row validation: only flag rows the user actually edited. Untouched
  // rows are not in error even if their stored amount stringifies oddly,
  // because the draft is seeded from the row's own amount.
  const draftErrorsByRowId = useMemo(() => {
    return Object.fromEntries(
      rows.map((row) => {
        const draft = drafts[row.id];
        if (!draft) return [row.id, undefined];
        if (draft.monthlyContribution === String(row.monthlyContribution)) {
          return [row.id, undefined];
        }
        if (draft.monthlyContribution.trim() === "") {
          return [row.id, t("amountRequired")];
        }
        const parsed = parseMoneyInput(draft.monthlyContribution, {
          allowNegative: false,
          maxDecimals: 2,
        });
        if (parsed === null) {
          return [row.id, t("amountInvalid")];
        }
        return [row.id, undefined];
      }),
    ) as Record<string, string | undefined>;
  }, [rows, drafts, t]);

  const hasValidationErrors = useMemo(
    () => Object.values(draftErrorsByRowId).some(Boolean),
    [draftErrorsByRowId],
  );

  const baseSavingsDraftError = useMemo(() => {
    if (!hasDashboardSavings) return undefined;
    if (baseSavingsDraft.trim() === "") return t("amountRequired");
    const parsed = parseMoneyInput(baseSavingsDraft, {
      allowNegative: false,
      maxDecimals: 2,
    });
    return parsed === null ? t("amountInvalid") : undefined;
  }, [baseSavingsDraft, hasDashboardSavings, t]);

  const parsedBaseSavingsDraft = useMemo(
    () =>
      parseMoneyInput(baseSavingsDraft, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [baseSavingsDraft],
  );

  const hasBaseSavingsChange =
    hasDashboardSavings &&
    parsedBaseSavingsDraft !== null &&
    parsedBaseSavingsDraft !== baseSavingsServer;
  const hasBaseSavingsValidationError = Boolean(baseSavingsDraftError);
  const hasAnyValidationErrors =
    hasValidationErrors || hasBaseSavingsValidationError;
  const hasProjectionChanges = hasGoalChanges || hasBaseSavingsChange;

  const baseDomainTotal = useMemo(
    () =>
      (hasDashboardSavings ? baseSavingsServer : 0) +
      rows.reduce((sum, row) => sum + row.monthlyContribution, 0),
    [baseSavingsServer, hasDashboardSavings, rows],
  );

  const draftDomainTotal = useMemo(
    () => {
      const effectiveBaseSavings =
        hasDashboardSavings &&
        hasBaseSavingsChange &&
        parsedBaseSavingsDraft !== null
          ? parsedBaseSavingsDraft
          : baseSavingsServer;

      return (
        (hasDashboardSavings ? effectiveBaseSavings : 0) +
        rows.reduce((sum, row) => {
          const draft = drafts[row.id];
          const parsed =
            draft &&
            parseMoneyInput(draft.monthlyContribution, {
              allowNegative: false,
              maxDecimals: 2,
            });
          return (
            sum +
            (typeof parsed === "number" ? parsed : row.monthlyContribution)
          );
        }, 0)
      );
    },
    [
      baseSavingsServer,
      drafts,
      hasBaseSavingsChange,
      hasDashboardSavings,
      parsedBaseSavingsDraft,
      rows,
    ],
  );

  const applyBaseSavings = async () => {
    if (readOnly || !hasDashboardSavings) return;
    if (!hasBaseSavingsChange) return;

    if (baseSavingsDraftError || parsedBaseSavingsDraft === null) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    try {
      await baseSavingsMutation.mutateAsync({
        amountMonthly: parsedBaseSavingsDraft,
        scope: "currentMonthOnly",
      });
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveErrorGeneric"));
    }
  };

  const saveAll = async () => {
    if (readOnly) return;
    if (!hasGoalChanges) return;

    if (hasAnyValidationErrors) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    const payload = changedRows.map((row) => {
      const draft = drafts[row.id] ?? {
        monthlyContribution: String(row.monthlyContribution),
      };
      const parsed = parseMoneyInput(draft.monthlyContribution, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (parsed === null) throw new Error("Invalid amount.");

      return {
        monthSavingsGoalId: row.id,
        payload: {
          monthlyContribution: parsed,
          scope: "currentMonthOnly" as const,
        },
      };
    });

    await bulkMutation.mutateAsync(payload);
    toast.success(t("saveSuccess"));
    onClose();
  };

  if (query.isLoading) {
    return (
      <PanelShell
        body={<div className="text-sm text-eb-text/60">{t("loadingEditor")}</div>}
        footer={null}
      />
    );
  }

  return (
    <PanelShell
      body={
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/68">
            {t("savingsMonthOnlyHelper").replace("{month}", periodLabel)}
          </div>
          {readOnly ? (
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.24)] p-4 text-sm text-eb-text/70">
              {t("monthClosedReadOnly")}
            </div>
          ) : null}
          {dashboardSavings ? (
            <EditPeriodSection
              title={t("savingsBaseTitle")}
              description={t("savingsBaseDescription")}
            >
              <BaseSavingsQuickRow
                amountMonthly={baseSavingsServer}
                draftAmount={baseSavingsDraft}
                isMonthOnly={dashboardSavings.isMonthOnly}
                readOnly={readOnly}
                currency={currency}
                locale={locale}
                error={baseSavingsDraftError}
                amountLabel={t("savingsBaseAmountLabel")}
                monthOnlyHint={t("savingsBaseMonthOnlyHint")}
                applyLabel={t("savingsBaseApply")}
                isApplying={baseSavingsMutation.isPending}
                canApply={
                  !readOnly &&
                  hasBaseSavingsChange &&
                  !hasBaseSavingsValidationError &&
                  !baseSavingsMutation.isPending
                }
                onAmountChange={(value) =>
                  setBaseSavingsDraft(sanitizeMoneyInput(value))
                }
                onApply={() => {
                  void applyBaseSavings();
                }}
              />
            </EditPeriodSection>
          ) : null}
          <EditPeriodSection
            title={
              dashboardSavings ? t("savingsGoalsSectionTitle") : t("savingsTitle")
            }
            description={t("savingsDescription")}
          >
            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                  {t("noSavingsGoals")}
                </div>
              ) : (
                rows.map((row) => (
                  <SavingsQuickRow
                    key={row.id}
                    row={row}
                    draft={
                      drafts[row.id] ?? {
                        monthlyContribution: String(row.monthlyContribution),
                      }
                    }
                    currency={currency}
                    locale={locale}
                    readOnly={readOnly}
                    error={draftErrorsByRowId[row.id]}
                    onAmountChange={(value) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...(prev[row.id] ?? {
                            monthlyContribution: String(row.monthlyContribution),
                          }),
                          monthlyContribution: sanitizeMoneyInput(value),
                        },
                      }))
                    }
                  />
                ))
              )}
            </div>
          </EditPeriodSection>
        </div>
      }
      footer={
        <EditPeriodFooter
          onCancel={onClose}
          onSave={saveAll}
          onOpenPlanning={() => {
            onClose();
            navigate("/dashboard/savings");
          }}
          isSaving={bulkMutation.isPending}
          isDisabled={readOnly || !hasGoalChanges || hasAnyValidationErrors}
          summaryText={
            readOnly
              ? t("footerSummaryReadOnly")
              : hasAnyValidationErrors
                ? t("fixValidationErrors")
                : hasProjectionChanges
                  ? t("footerSummaryEditable")
                  : t("footerSummaryNoChanges")
          }
          projection={
            dashboardTerms
              ? {
                  terms: dashboardTerms,
                  domain: "savings",
                  baseDomainTotal,
                  draftDomainTotal,
                  currency,
                  hasChanges: hasProjectionChanges,
                  hasValidationErrors: hasAnyValidationErrors,
                  readOnly,
                }
              : undefined
          }
        />
      }
    />
  );
};

function BaseSavingsQuickRow({
  amountMonthly,
  draftAmount,
  isMonthOnly,
  readOnly,
  currency,
  locale,
  error,
  amountLabel,
  monthOnlyHint,
  applyLabel,
  isApplying,
  canApply,
  onAmountChange,
  onApply,
}: {
  amountMonthly: number;
  draftAmount: string;
  isMonthOnly: boolean;
  readOnly: boolean;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
  error?: string;
  amountLabel: string;
  monthOnlyHint: string;
  applyLabel: string;
  isApplying: boolean;
  canApply: boolean;
  onAmountChange: (value: string) => void;
  onApply: () => void;
}) {
  const errorId = error ? "savings-base-error" : undefined;

  return (
    <div
      data-testid="period-savings-base-row"
      className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-eb-text">
            {amountLabel}
          </div>
          <div className="mt-1 text-xs text-eb-text/55">
            {formatMoneyV2(amountMonthly, currency, locale, {
              fractionDigits: 2,
            })}
          </div>
          {isMonthOnly ? (
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-eb-text/55">
              {monthOnlyHint}
            </div>
          ) : null}
        </div>
      </div>

      {readOnly ? null : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            inputMode="decimal"
            aria-label={amountLabel}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            value={draftAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            className={`h-11 w-full rounded-2xl border bg-[rgb(var(--eb-shell)/0.32)] px-4 text-right text-sm font-bold tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 ${
              error
                ? "border-eb-danger/60 focus-visible:ring-eb-danger/25"
                : "border-eb-stroke/30 focus-visible:ring-eb-accent/20"
            }`}
          />
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            aria-busy={isApplying ? true : undefined}
            data-testid="period-savings-base-apply"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm font-semibold text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applyLabel}
          </button>
        </div>
      )}

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

function SavingsQuickRow({
  row,
  draft,
  currency,
  locale,
  readOnly,
  error,
  onAmountChange,
}: {
  row: BudgetMonthSavingsGoalEditorRowDto;
  draft: Draft;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
  readOnly: boolean;
  error?: string;
  onAmountChange: (value: string) => void;
}) {
  const errorId = error ? `savings-row-error-${row.id}` : undefined;
  return (
    <div
      data-testid={`period-savings-row-${row.id}`}
      className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {row.name}
          </div>
          <div className="mt-1 text-xs text-eb-text/55">
            {formatMoneyV2(row.monthlyContribution, currency, locale, {
              fractionDigits: 2,
            })}
          </div>
        </div>
      </div>
      {readOnly ? null : (
        <input
          type="text"
          inputMode="decimal"
          aria-label={row.name}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          value={draft.monthlyContribution}
          onChange={(event) => onAmountChange(event.target.value)}
          className={`mt-3 h-11 w-full rounded-2xl border bg-[rgb(var(--eb-shell)/0.32)] px-4 text-right text-sm font-bold tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 ${
            error
              ? "border-eb-danger/60 focus-visible:ring-eb-danger/25"
              : "border-eb-stroke/30 focus-visible:ring-eb-accent/20"
          }`}
        />
      )}
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

export default SavingsPanel;
