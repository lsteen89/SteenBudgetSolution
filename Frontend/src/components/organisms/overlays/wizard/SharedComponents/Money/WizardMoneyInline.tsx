import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyParts } from "@/utils/money/formatMoneyParts";

type Props = {
    value: number;
    currency: CurrencyCode;
    locale: string;
    suffix?: string; // "/mån"
    fractionDigits?: number;

    className?: string;
};

const WizardMoneyInline: React.FC<Props> = ({
    value,
    currency,
    locale,
    suffix,
    fractionDigits = 0,
    className,
}) => {
    const { numberText, currencyText } = useMemo(
        () => formatMoneyParts(value, currency, locale, fractionDigits),
        [value, currency, locale, fractionDigits]
    );

    return (
        <span className={cn("flex items-baseline gap-1 whitespace-nowrap", className)}>
            <span className="money font-semibold">{numberText}</span>
            <span className="text-white/60 text-sm font-semibold">
                {currencyText}
                {suffix ? ` ${suffix}` : ""}
            </span>
        </span>
    );
};

export default WizardMoneyInline;
