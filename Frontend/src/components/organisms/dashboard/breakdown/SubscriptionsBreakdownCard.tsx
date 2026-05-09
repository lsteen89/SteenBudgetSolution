import React from "react";
import { Link } from "react-router-dom";
import CardShell from "@/components/atoms/cards/CardShell";
import type { RecurringExpenseSummary } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { breakdownCardsDict } from "@/utils/i18n/pages/private/dashboard/pages/BreakdownCards.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
    currency: CurrencyCode;
    subscriptionsTotal: number;
    subscriptionsCount: number;
    subscriptions: RecurringExpenseSummary[];
    maxItems?: number;
};

const interpolate = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const SubscriptionsBreakdownCard: React.FC<Props> = ({
    currency,
    subscriptionsTotal,
    subscriptionsCount,
    subscriptions,
    maxItems = 6,
}) => {
    const locale = useAppLocale();
    const t = <K extends keyof typeof breakdownCardsDict.sv>(key: K) =>
        tDict(key, locale, breakdownCardsDict);
    const fmt = (n: number) => formatMoneyV2(n, currency, locale);

    return (
        <CardShell
            title={t("subscriptionsTitle")}
            subtitle={
                subscriptionsCount === 0
                    ? t("subscriptionsEmpty")
                    : interpolate(t("subscriptionsSummary"), {
                        count: subscriptionsCount,
                        amount: fmt(subscriptionsTotal),
                    })
            }
            actions={
                <Link
                    to="/expenses/subscriptions"
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                    {t("manage")}
                </Link>
            }
        >
            {subscriptionsCount > 0 ? (
                <div className="space-y-2 text-xs text-slate-700">
                    {subscriptions.slice(0, maxItems).map((s) => (
                        <div key={s.id} className="flex items-baseline justify-between">
                            <span className="font-medium">{s.nameLabel}</span>
                            <span>{fmt(s.amountMonthly)}{t("perMonthSuffix")}</span>
                        </div>
                    ))}

                    {subscriptionsCount > maxItems && (
                        <p className="text-[11px] text-slate-500 pt-1">
                            {interpolate(t("more"), { count: subscriptionsCount - maxItems })}
                        </p>
                    )}
                </div>
            ) : null}
        </CardShell>
    );
};

export default SubscriptionsBreakdownCard;
