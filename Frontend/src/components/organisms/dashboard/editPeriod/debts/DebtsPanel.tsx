import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  useBudgetMonthDebtEditor,
  usePatchBudgetMonthDebtsBulk,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { calcDebtPaymentBreakdown } from "@/Pages/private/debts/utils/debtPaymentBreakdown";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import type { CurrencyCode } from "@/types/i18n/currency";
import { useToast } from "@/ui/toast/toast";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";

type DebtsPanelProps = {
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
   * debts tab. Optional so legacy callers fall back to the summary copy.
   */
  dashboardTerms?: DashboardTerms;
  /**
   * Currency for the projection preview. Falls back to the user's app
   * currency when omitted.
   */
  currency?: CurrencyCode;
};

type Draft = {
  monthlyPayment: string;
};

/**
 * PR F — Debt honesty upgrade.
 *
 * The quick debt panel reads from the rich `debt-editor` endpoint (instead
 * of the legacy `debt-items` list) so the drawer can:
 *
 *   - render balance + minimum payment as read-only context, never editable
 *   - honor `actions.canEditPayment` and `isReadOnly` from the backend
 *     instead of inferring editability from `status`/`isDeleted`
 *   - warn when the planned payment is below `minPayment`, and use the
 *     stronger `paymentBreakdown.coversInterestAndFees` advisory from the
 *     backend's breakdown when it disagrees with a naïve min comparison
 *   - render an honest footer projection using
 *     `summary.includedMonthlyPaymentTotal` — only included (`group === "active"`)
 *     rows contribute to the dashboard's debt term, so a skipped row's
 *     payment change can no longer pretend to move free money
 *
 * Balance updates remain out of scope here. The full debt page owns
 * `Uppdatera saldo` (non-idempotent, append-only event) with its own
 * duplicate-submit protection; the quick drawer never relabels planned
 * payment as actual payment.
 */
const DebtsPanel: React.FC<DebtsPanelProps> = ({
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
  const query = useBudgetMonthDebtEditor(yearMonth, open && isActive);
  const bulkMutation = usePatchBudgetMonthDebtsBulk(yearMonth);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const readOnly = query.data?.isReadOnly ?? false;

  // Only included rows contribute to the dashboard's debt term. Skipped /
  // paid / archived rows live in the full editor — surfacing them here
  // would invite quick-edit affordances we explicitly defer to that flow.
  const editableRows = useMemo<DebtEditorRowDto[]>(
    () => (query.data?.rows ?? []).filter((row) => row.group === "active"),
    [query.data],
  );

  // Drafts are keyed by row id. We only seed drafts for rows whose payment
  // is actually editable; the backend's `actions.canEditPayment` is the
  // single source of truth (it already folds in month state + row state).
  useEffect(() => {
    if (!open || !query.data) return;
    setDrafts(
      Object.fromEntries(
        editableRows
          .filter((row) => row.actions.canEditPayment && !readOnly)
          .map((row) => [
            row.id,
            { monthlyPayment: String(row.monthlyPayment) },
          ]),
      ),
    );
  }, [open, query.data, editableRows, readOnly]);

  const changedRows = useMemo(
    () =>
      editableRows.filter((row) => {
        const draft = drafts[row.id];
        if (!draft) return false;
        const parsed = parseMoneyInput(draft.monthlyPayment, {
          allowNegative: false,
          maxDecimals: 2,
        });
        return parsed !== row.monthlyPayment;
      }),
    [drafts, editableRows],
  );

  const hasChanges = changedRows.length > 0;

  const draftErrorsByRowId = useMemo(() => {
    return Object.fromEntries(
      editableRows.map((row) => {
        const draft = drafts[row.id];
        if (!draft) return [row.id, undefined];
        if (draft.monthlyPayment === String(row.monthlyPayment)) {
          return [row.id, undefined];
        }
        if (draft.monthlyPayment.trim() === "") {
          return [row.id, t("amountRequired")];
        }
        const parsed = parseMoneyInput(draft.monthlyPayment, {
          allowNegative: false,
          maxDecimals: 2,
        });
        if (parsed === null) {
          return [row.id, t("amountInvalid")];
        }
        return [row.id, undefined];
      }),
    ) as Record<string, string | undefined>;
  }, [editableRows, drafts, t]);

  const hasValidationErrors = useMemo(
    () => Object.values(draftErrorsByRowId).some(Boolean),
    [draftErrorsByRowId],
  );

  // Footer projection inputs. Base total is the backend-derived
  // included-payment total (matches the dashboard equation). Draft total
  // sums each row's current draft (if any) or its stored monthlyPayment;
  // skipped rows do not appear in `editableRows`, so they cannot leak
  // into the draft projection either.
  const baseDomainTotal = query.data?.summary.includedMonthlyPaymentTotal ?? 0;

  const draftDomainTotal = useMemo(() => {
    return editableRows.reduce((sum, row) => {
      const draft = drafts[row.id];
      if (!draft) return sum + row.monthlyPayment;
      const parsed = parseMoneyInput(draft.monthlyPayment, {
        allowNegative: false,
        maxDecimals: 2,
      });
      return sum + (parsed ?? row.monthlyPayment);
    }, 0);
  }, [editableRows, drafts]);

  const saveAll = async () => {
    if (readOnly) return;
    if (!hasChanges) return;

    if (hasValidationErrors) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    const payload = changedRows
      // Defensive: never send a row the backend told us we can't edit.
      // The drafts effect already filters by canEditPayment, but a row
      // permission can flip between fetches.
      .filter((row) => row.actions.canEditPayment)
      .map((row) => {
        const draft = drafts[row.id] ?? {
          monthlyPayment: String(row.monthlyPayment),
        };
        const parsed = parseMoneyInput(draft.monthlyPayment, {
          allowNegative: false,
          maxDecimals: 2,
        });
        if (parsed === null) throw new Error("Invalid amount.");

        return {
          monthDebtId: row.id,
          payload: {
            monthlyPayment: parsed,
            scope: "currentMonthOnly" as const,
          },
        };
      });

    if (payload.length === 0) return;

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

  const projection = dashboardTerms
    ? {
        terms: dashboardTerms,
        domain: "debts" as const,
        baseDomainTotal,
        draftDomainTotal,
        currency,
        hasChanges,
        hasValidationErrors,
        readOnly,
      }
    : undefined;

  return (
    <PanelShell
      body={
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 text-sm text-eb-text/68">
            {t("debtsMonthOnlyHelper").replace("{month}", periodLabel)}
          </div>
          <div className="rounded-2xl border border-eb-stroke/16 bg-eb-surface p-3 text-xs text-eb-text/55">
            {t("debtsPlannedNote")}
          </div>
          {readOnly ? (
            <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.24)] p-4 text-sm text-eb-text/70">
              {t("monthClosedReadOnly")}
            </div>
          ) : null}
          <EditPeriodSection
            title={t("debtsTitle")}
            description={t("debtsDescription")}
          >
            <div className="space-y-3">
              {editableRows.length === 0 ? (
                <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                  {t("noDebts")}
                </div>
              ) : (
                editableRows.map((row) => {
                  const isRowEditable =
                    !readOnly && row.actions.canEditPayment;
                  const draft = drafts[row.id] ?? {
                    monthlyPayment: String(row.monthlyPayment),
                  };
                  return (
                    <DebtsQuickRow
                      key={row.id}
                      row={row}
                      draft={draft}
                      currency={currency}
                      locale={locale}
                      isEditable={isRowEditable}
                      error={draftErrorsByRowId[row.id]}
                      labels={{
                        plannedPayment: t("debtsPlannedPaymentLabel"),
                        balance: t("debtsBalanceLabel"),
                        minPayment: t("debtsMinPaymentLabel"),
                        contextHint: t("debtsContextReadOnlyHint"),
                        belowMin: t("debtsBelowMinWarning"),
                        coversInterestAndFees: t(
                          "debtsCoversInterestAndFeesWarning",
                        ),
                        rowReadOnly: t("debtsRowReadOnly"),
                      }}
                      onAmountChange={(value) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: {
                            ...(prev[row.id] ?? {
                              monthlyPayment: String(row.monthlyPayment),
                            }),
                            monthlyPayment: sanitizeMoneyInput(value),
                          },
                        }))
                      }
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
          onSave={saveAll}
          onOpenPlanning={() => {
            onClose();
            navigate("/dashboard/debts");
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
          projection={projection}
        />
      }
    />
  );
};

type RowLabels = {
  plannedPayment: string;
  balance: string;
  minPayment: string;
  contextHint: string;
  belowMin: string;
  coversInterestAndFees: string;
  rowReadOnly: string;
};

function DebtsQuickRow({
  row,
  draft,
  currency,
  locale,
  isEditable,
  error,
  labels,
  onAmountChange,
}: {
  row: DebtEditorRowDto;
  draft: Draft;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
  isEditable: boolean;
  error?: string;
  labels: RowLabels;
  onAmountChange: (value: string) => void;
}) {
  const errorId = error ? `debt-row-error-${row.id}` : undefined;

  // Below-minimum warning: only meaningful when the backend supplies a
  // minimum and the current draft (or stored payment, if untouched) sits
  // below it. We never block save on this — the backend validator owns
  // hard rules; the UI here is advisory.
  const parsedDraft = parseMoneyInput(draft.monthlyPayment, {
    allowNegative: false,
    maxDecimals: 2,
  });
  const effectivePayment = parsedDraft ?? row.monthlyPayment;
  const minPayment = row.minPayment;
  const belowMin =
    minPayment !== null && minPayment > 0 && effectivePayment < minPayment;

  // `coversInterestAndFees` is the stronger advisory: it folds APR +
  // monthly fee + balance into one truth. We compute it from the user's
  // current draft via the client-side mirror of the backend formula
  // (`calcDebtPaymentBreakdown`) so it tracks dirty edits in both
  // directions — lowering payment below the interest+fee floor surfaces
  // the warning, raising it back above clears it. Reading the row's
  // backend `paymentBreakdown` snapshot would be stale by definition
  // before save. Copy stays identical to the full Debt editor so the
  // user never reads two stories about the same row.
  const previewBreakdown = calcDebtPaymentBreakdown({
    currentBalance: row.balance,
    annualInterestPercent: row.apr,
    monthlyFee: row.monthlyFee,
    plannedMonthlyPayment: effectivePayment,
  });
  const showCoversWarning = !previewBreakdown.coversInterestAndFees;
  const showBelowMin = !showCoversWarning && belowMin;

  return (
    <div
      data-testid={`period-debt-row-${row.id}`}
      className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {row.name}
          </div>
          <div className="mt-1 text-xs text-eb-text/55">
            {labels.plannedPayment}:{" "}
            {formatMoneyV2(row.monthlyPayment, currency, locale, {
              fractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <input
        type="text"
        inputMode="decimal"
        aria-label={row.name}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        disabled={!isEditable}
        readOnly={!isEditable}
        value={draft.monthlyPayment}
        onChange={(event) => onAmountChange(event.target.value)}
        className={`mt-3 h-11 w-full rounded-2xl border bg-[rgb(var(--eb-shell)/0.32)] px-4 text-right text-sm font-bold tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 ${
          error
            ? "border-eb-danger/60 focus-visible:ring-eb-danger/25"
            : "border-eb-stroke/30 focus-visible:ring-eb-accent/20"
        } ${!isEditable ? "cursor-not-allowed opacity-60" : ""}`}
      />

      {/* Fenced read-only context. Balance and minimum payment are never
          editable in the quick drawer — balance moves through the dedicated
          `Uppdatera saldo` flow on the debts page, and the minimum is a
          property of the source debt edited via debt details. */}
      <dl
        className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-eb-stroke/16 bg-[rgb(var(--eb-shell)/0.24)] px-3 py-2 text-xs text-eb-text/70"
        data-testid={`period-debt-context-${row.id}`}
      >
        <div className="min-w-0">
          <dt className="font-medium text-eb-text/55">{labels.balance}</dt>
          <dd className="mt-0.5 truncate font-semibold tabular-nums text-eb-text">
            {formatMoneyV2(row.balance, currency, locale, {
              fractionDigits: 2,
            })}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-medium text-eb-text/55">{labels.minPayment}</dt>
          <dd className="mt-0.5 truncate font-semibold tabular-nums text-eb-text">
            {minPayment !== null && minPayment > 0
              ? formatMoneyV2(minPayment, currency, locale, {
                  fractionDigits: 2,
                })
              : "—"}
          </dd>
        </div>
        <div className="col-span-2 text-[11px] text-eb-text/50">
          {labels.contextHint}
        </div>
      </dl>

      {error ? (
        <div
          id={errorId}
          className="mt-2 text-xs font-medium text-eb-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!error && showCoversWarning ? (
        <div
          className="mt-2 rounded-xl border border-eb-danger/30 bg-eb-danger/10 px-3 py-2 text-xs font-medium text-eb-danger"
          role="status"
          data-testid={`period-debt-warning-${row.id}`}
        >
          {labels.coversInterestAndFees}
        </div>
      ) : null}

      {!error && showBelowMin ? (
        <div
          className="mt-2 rounded-xl border border-eb-danger/25 bg-eb-danger/10 px-3 py-2 text-xs font-medium text-eb-danger"
          role="status"
          data-testid={`period-debt-warning-${row.id}`}
        >
          {labels.belowMin.replace(
            "{amount}",
            formatMoneyV2(minPayment ?? 0, currency, locale, {
              fractionDigits: 2,
            }),
          )}
        </div>
      ) : null}

      {!isEditable ? (
        <div className="mt-2 text-[11px] text-eb-text/55">
          {labels.rowReadOnly}
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

export default DebtsPanel;
