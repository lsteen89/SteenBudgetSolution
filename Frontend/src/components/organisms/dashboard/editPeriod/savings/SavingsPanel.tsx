import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  useBudgetMonthSavingsGoals,
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
}) => {
  const locale = useAppLocale();
  const fallbackCurrency = useAppCurrency();
  const currency = currencyProp ?? fallbackCurrency;
  const toast = useToast();
  const navigate = useNavigate();
  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const query = useBudgetMonthSavingsGoals(yearMonth, open && isActive);
  const bulkMutation = usePatchBudgetMonthSavingsGoalsBulk(yearMonth);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!open || !query.data) return;
    setDrafts(
      Object.fromEntries(
        query.data
          .filter((row) => !row.isDeleted && row.status !== "closed")
          .map((row) => [
            row.id,
            {
              monthlyContribution: String(row.monthlyContribution),
            },
          ]),
      ),
    );
  }, [open, query.data]);

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

  const hasChanges = changedRows.length > 0;

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

  // Footer projection: sum over rows the panel renders. PR E will widen this
  // to include base savings; for now the projection is honest for goal
  // contributions only — base savings is unaffected and cancels out.
  const baseDomainTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.monthlyContribution, 0),
    [rows],
  );

  const draftDomainTotal = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const draft = drafts[row.id];
        const parsed =
          draft &&
          parseMoneyInput(draft.monthlyContribution, {
            allowNegative: false,
            maxDecimals: 2,
          });
        return (
          sum + (typeof parsed === "number" ? parsed : row.monthlyContribution)
        );
      }, 0),
    [rows, drafts],
  );

  const saveAll = async () => {
    if (!hasChanges) return;

    if (hasValidationErrors) {
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
          <EditPeriodSection
            title={t("savingsTitle")}
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
          isDisabled={!hasChanges || hasValidationErrors}
          summaryText={
            hasValidationErrors
              ? t("fixValidationErrors")
              : hasChanges
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
                  hasChanges,
                  hasValidationErrors,
                }
              : undefined
          }
        />
      }
    />
  );
};

function SavingsQuickRow({
  row,
  draft,
  currency,
  locale,
  error,
  onAmountChange,
}: {
  row: BudgetMonthSavingsGoalEditorRowDto;
  draft: Draft;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
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
