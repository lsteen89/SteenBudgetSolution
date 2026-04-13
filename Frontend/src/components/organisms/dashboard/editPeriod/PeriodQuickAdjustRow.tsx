import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { BudgetMonthExpenseItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { periodQuickAdjustRowDict } from "@/utils/i18n/pages/private/dashboard/cards/period/PeriodQuickAdjustRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import React from "react";

type PeriodQuickAdjustRowProps = {
  row: BudgetMonthExpenseItemEditorRowDto;
  currency: CurrencyCode;
  readOnly: boolean;
  categoryLabel: string;
  amountMonthly: number;
  isActive: boolean;
  showActiveToggle: boolean;
  onAmountChange: (value: number) => void;
  onActiveChange?: (value: boolean) => void;
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
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof periodQuickAdjustRowDict.sv>(key: K) =>
    tDict(key, locale, periodQuickAdjustRowDict);

  const [inputValue, setInputValue] = React.useState(String(amountMonthly));

  React.useEffect(() => {
    setInputValue(String(amountMonthly));
  }, [amountMonthly]);

  const handleAmountChange = (raw: string) => {
    setInputValue(raw);

    const normalized = raw.replace(",", ".").trim();

    if (normalized === "") {
      onAmountChange(0);
      return;
    }

    const parsed = Number(normalized);

    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      onAmountChange(parsed);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-eb-text">
          {row.name}
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

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {showActiveToggle ? (
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-eb-text/65">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange?.(e.target.checked)}
              disabled={readOnly}
              className="h-4 w-4 rounded border-eb-stroke/40"
            />
            <span className="hidden sm:inline">{t("activeInThisMonth")}</span>
            <span className="sm:hidden">{t("activeShort")}</span>
          </label>
        ) : null}

        <div className="w-[132px] shrink-0">
          <label className="sr-only" htmlFor={`amount-${row.id}`}>
            {t("amountPlaceholder")}
          </label>

          <input
            id={`amount-${row.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={inputValue}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={readOnly || (showActiveToggle && !isActive)}
            className={cn(
              "h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-right text-sm font-semibold tabular-nums text-eb-text",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "[appearance:textfield]",
              "[&::-webkit-outer-spin-button]:appearance-none",
              "[&::-webkit-inner-spin-button]:appearance-none",
            )}
          />

          <div className="mt-1 text-right text-[11px] text-eb-text/45">
            {formatMoneyV2(amountMonthly, currency, locale, {
              fractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodQuickAdjustRow;
