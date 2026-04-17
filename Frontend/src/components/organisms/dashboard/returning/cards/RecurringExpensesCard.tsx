import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import CardShell from "@/components/atoms/cards/CardShell";
import type { RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { AppLocale } from "@/types/i18n/appLocale";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { recurringExpensesCardDict } from "@/utils/i18n/pages/private/dashboard/cards/RecurringExpensesCard.i18n";

type Props = {
  currency: CurrencyCode;
  recurringExpenses: RecurringExpenseSummary[];
  yearMonth: string;
  maxItems?: number;
};

type RecurringExpensesCardTKey = keyof typeof recurringExpensesCardDict.sv;
type RecurringExpensesCardT = (key: RecurringExpensesCardTKey) => string;

function createRecurringExpensesCardT(
  locale: AppLocale,
): RecurringExpensesCardT {
  return (key) => tDict(key, locale, recurringExpensesCardDict);
}

const RecurringExpensesCard: React.FC<Props> = ({
  currency,
  recurringExpenses,
  yearMonth,
  maxItems = 5,
}) => {
  const locale = useAppLocale();
  const t = createRecurringExpensesCardT(locale);

  const items = useMemo(() => {
    return [...recurringExpenses]
      .filter((x) => x.amountMonthly > 0)
      .filter((x) => x.categoryKey !== "subscription")
      .sort((a, b) => b.amountMonthly - a.amountMonthly)
      .slice(0, maxItems);
  }, [recurringExpenses, maxItems]);

  return (
    <CardShell
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
          {t("topLabel").replace("{count}", String(maxItems))}
        </span>
      }
      footer={
        <Link
          to={`/expenses/recurring?yearMonth=${encodeURIComponent(yearMonth)}`}
          className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          {t("viewAll")}
        </Link>
      }
    >
      <div className="space-y-2 text-xs text-slate-700">
        {items.length === 0 ? (
          <p className="text-slate-500">{t("empty")}</p>
        ) : (
          items.map((e) => (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0 flex flex-col">
                <span className="truncate font-medium">{e.nameLabel}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {e.categoryLabel}
                </span>
              </div>

              <span className="whitespace-nowrap tabular-nums">
                {formatMoneyV2(e.amountMonthly, currency, locale)}
                {t("perMonthSuffix")}
              </span>
            </div>
          ))
        )}
      </div>
    </CardShell>
  );
};

export default RecurringExpensesCard;
