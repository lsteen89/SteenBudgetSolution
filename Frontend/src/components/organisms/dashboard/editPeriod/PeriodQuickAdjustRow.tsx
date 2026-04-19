import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthExpenseItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { labelLedgerItem } from "@/utils/i18n/budget/ledgerItems";
import { periodQuickAdjustRowDict } from "@/utils/i18n/pages/private/dashboard/cards/period/PeriodQuickAdjustRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneySplitV2, formatMoneyV2 } from "@/utils/money/moneyV2";
import React from "react";

type PeriodQuickAdjustRowProps = {
  row: BudgetMonthExpenseItemEditorRowDto;
  currency: CurrencyCode;
  readOnly: boolean;
  categoryLabel: string;
  amountMonthly: string;
  isActive: boolean;
  showActiveToggle: boolean;
  onAmountChange: (value: string) => void;
  onActiveChange?: (value: boolean) => void;
  error?: string;
};

const PeriodQuickAdjustRow: React.FC<PeriodQuickAdjustRowProps> = ({
  row,
  currency,
  readOnly,
  categoryLabel,
  amountMonthly,
  isActive,
  showActiveToggle,
  onAmountChange,
  onActiveChange,
  error,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof periodQuickAdjustRowDict.sv>(key: K) =>
    tDict(key, locale, periodQuickAdjustRowDict);

  const inputId = `amount-${row.id}`;

  const displayName = React.useMemo(
    () => labelLedgerItem(row.name, locale),
    [row.name, locale],
  );

  const parsedPreviewAmount = React.useMemo(() => {
    const parsed = parseMoneyInput(amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    });

    return parsed ?? 0;
  }, [amountMonthly]);

  const currencyParts = React.useMemo(
    () => formatMoneySplitV2(0, currency, locale, { fractionDigits: 2 }),
    [currency, locale],
  );

  const handleAmountChange = (raw: string) => {
    const cleaned = sanitizeMoneyInput(raw);
    onAmountChange(cleaned);
  };

  return (
    <div className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div
            className="truncate text-sm font-semibold text-eb-text"
            title={displayName}
          >
            {displayName}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-eb-text/55">{categoryLabel}</span>

            {row.isMonthOnly ? (
              <span className="rounded-full bg-[rgb(var(--eb-shell)/0.7)] px-2 py-1 text-[11px] font-semibold text-eb-text/65">
                {t("monthOnly")}
              </span>
            ) : null}
          </div>
        </div>

        {showActiveToggle ? (
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-eb-text/65">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange?.(e.target.checked)}
              disabled={readOnly}
              className="h-4 w-4 rounded border-eb-stroke/40"
            />
            <span>{t("activeInThisMonth")}</span>
          </label>
        ) : null}

        <div className="w-full sm:w-[156px] sm:self-end">
          <label className="sr-only" htmlFor={inputId}>
            {t("amountPlaceholder")}
          </label>

          <div className="relative">
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={amountMonthly}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={readOnly || (showActiveToggle && !isActive)}
              aria-invalid={error ? "true" : "false"}
              className={cn(
                "h-12 w-full rounded-2xl border px-4 pr-12 text-right text-base font-bold tabular-nums",
                "bg-[rgb(var(--eb-shell)/0.42)] text-eb-text",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-4",
                "disabled:cursor-not-allowed disabled:opacity-55",
                error
                  ? "border-red-400/70 focus-visible:border-red-400/70 focus-visible:ring-red-400/20"
                  : "border-eb-stroke/55 hover:border-eb-stroke/75 focus-visible:border-eb-accent/40 focus-visible:ring-eb-accent/20",
              )}
            />

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-eb-text/50">
              {currencyParts.symbol}
            </div>
          </div>

          <div className="mt-1 min-h-[1rem] pr-1 text-right text-[11px]">
            {error ? (
              <span className="font-medium text-red-500">{error}</span>
            ) : (
              <span className="text-eb-text/45">
                {formatMoneyV2(parsedPreviewAmount, currency, locale, {
                  fractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodQuickAdjustRow;
