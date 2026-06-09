import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  useBudgetMonthIncomeItems,
  usePatchBudgetMonthIncomeItemsBulk,
} from "@/hooks/budget/editPeriod/useMonthEditor";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { CurrencyCode } from "@/types/i18n/currency";
import { useToast } from "@/ui/toast/toast";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import EditPeriodFooter from "../EditPeriodFooter";
import EditPeriodSection from "../EditPeriodSection";

type IncomePanelProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  onClose: () => void;
  /**
   * Whether this panel is the active tab inside the Quick Edit drawer.
   * The panel stays mounted while inactive so drafts survive a tab switch,
   * but its query is disabled when inactive so we do not pay for refetches
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
};

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
  const query = useBudgetMonthIncomeItems(yearMonth, open && isActive);
  const bulkMutation = usePatchBudgetMonthIncomeItemsBulk(yearMonth);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!open || !query.data) return;
    setDrafts(
      Object.fromEntries(
        query.data
          .filter((row) => !row.isDeleted)
          .map((row) => [
            row.id,
            {
              amountMonthly: String(row.amountMonthly),
            },
          ]),
      ),
    );
  }, [open, query.data]);

  const rows = useMemo(
    () => (query.data ?? []).filter((row) => !row.isDeleted),
    [query.data],
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
        return parsed !== row.amountMonthly;
      }),
    [drafts, rows],
  );

  const hasChanges = changedRows.length > 0;

  // Per-row validation. A row is in error when the user edited it (draft
  // amount differs from the rendered amount) AND the new value fails
  // money-input parsing. Rows the user never touched are not in error even
  // if their stored amount stringifies oddly, because we seed drafts from
  // the row's own amount.
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
  }, [rows, drafts, t]);

  const hasValidationErrors = useMemo(
    () => Object.values(draftErrorsByRowId).some(Boolean),
    [draftErrorsByRowId],
  );

  // Footer projection inputs. Dashboard income SQL counts only
  // `IsActive = 1`, so we sum the same way — inactive rows do not affect
  // the dashboard's `totalIncome`, so editing one must not project a fake
  // free-money delta. PR D will surface the active toggle in Quick Edit;
  // until then inactive rows are visible but excluded from projection.
  const activeRows = useMemo(
    () => rows.filter((row) => row.isActive),
    [rows],
  );

  const baseDomainTotal = useMemo(
    () => activeRows.reduce((sum, row) => sum + row.amountMonthly, 0),
    [activeRows],
  );

  const draftDomainTotal = useMemo(
    () =>
      activeRows.reduce((sum, row) => {
        const draft = drafts[row.id];
        const parsed =
          draft &&
          parseMoneyInput(draft.amountMonthly, {
            allowNegative: false,
            maxDecimals: 2,
          });
        return sum + (typeof parsed === "number" ? parsed : row.amountMonthly);
      }, 0),
    [activeRows, drafts],
  );

  const saveAll = async () => {
    if (!hasChanges) return;

    if (hasValidationErrors) {
      toast.error(t("fixValidationErrors"));
      return;
    }

    const payload = changedRows.map((row) => {
      const draft = drafts[row.id] ?? {
        amountMonthly: String(row.amountMonthly),
      };
      const parsed = parseMoneyInput(draft.amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (parsed === null) throw new Error("Invalid amount.");

      return {
        monthIncomeItemId: row.id,
        payload: {
          name: row.kind === "salary" ? null : row.name,
          amountMonthly: parsed,
          isActive: row.isActive,
          updateDefault: false,
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
            {t("incomeMonthOnlyHelper").replace("{month}", periodLabel)}
          </div>
          <EditPeriodSection
            title={t("incomeTitle")}
            description={t("incomeDescription")}
          >
            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface p-4 text-sm text-eb-text/60">
                  {t("noIncomeItems")}
                </div>
              ) : (
                rows.map((row) => (
                  <IncomeQuickRow
                    key={row.id}
                    row={row}
                    draft={
                      drafts[row.id] ?? {
                        amountMonthly: String(row.amountMonthly),
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
                            amountMonthly: String(row.amountMonthly),
                          }),
                          amountMonthly: sanitizeMoneyInput(value),
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
            navigate("/dashboard/income");
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
                  domain: "income",
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

function IncomeQuickRow({
  row,
  draft,
  currency,
  locale,
  error,
  onAmountChange,
}: {
  row: BudgetMonthIncomeItemEditorRowDto;
  draft: Draft;
  currency: Parameters<typeof formatMoneyV2>[1];
  locale: Parameters<typeof formatMoneyV2>[2];
  error?: string;
  onAmountChange: (value: string) => void;
}) {
  const errorId = error ? `income-row-error-${row.id}` : undefined;
  return (
    <div
      data-testid={`period-income-row-${row.id}`}
      className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-eb-text">
            {row.name}
          </div>
          <div className="mt-1 text-xs text-eb-text/55">
            {formatMoneyV2(row.amountMonthly, currency, locale, {
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
        value={draft.amountMonthly}
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

export default IncomePanel;
