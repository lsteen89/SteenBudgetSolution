import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  value: number;
  currency: CurrencyCode;
  locale: string;
  fractionDigits?: number;
  suffix?: string;
  hideIfZero?: boolean;
  className?: string;
  tone?: "neutral" | "accent";
  subtitleClassName?: string;
};

function getFractionDigits(value: number): number {
  if (Number.isInteger(value)) return 0;

  const normalized = value.toFixed(10).replace(/0+$/, "");
  const decimalPart = normalized.split(".")[1];
  return decimalPart ? Math.min(decimalPart.length, 2) : 0;
}

const WizardTotalBar: React.FC<Props> = ({
  title,
  subtitle,
  value,
  currency,
  locale,
  fractionDigits,
  suffix,
  hideIfZero = false,
  className,
  tone = "neutral",
  subtitleClassName,
}) => {
  if (hideIfZero && value <= 0) return null;

  const resolvedFractionDigits = fractionDigits ?? getFractionDigits(value);

  return (
    <div
      className={cn(
        "w-full rounded-2xl border backdrop-blur-[2px]",
        "bg-wizard-shell/40 border-wizard-strokeStrong/25",
        "shadow-[0_10px_30px_rgba(2,6,23,0.10)]",
        "px-4 py-3 flex items-center justify-between gap-4",
        "relative overflow-hidden",
        tone === "accent" && "pl-5",
        className,
      )}
    >
      {tone === "accent" ? (
        <span className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-darkLimeGreen/80 shadow-[0_0_14px_rgba(50,205,50,0.35)]" />
      ) : null}

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-wizard-text/70">
          {title}
        </p>

        {subtitle ? (
          <p
            className={cn(
              "text-sm text-wizard-text/65 leading-snug",
              subtitleClassName,
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 flex items-baseline gap-2 whitespace-nowrap">
        <span
          className={cn(
            "px-3 py-1.5 rounded-xl",
            "bg-wizard-shell-3/12",
            "border border-wizard-strokeStrong/30",
            "shadow-[0_6px_18px_rgba(2,6,23,0.14)]",
          )}
        >
          <span
            className={cn(
              "text-2xl font-extrabold tracking-tight text-darkLimeGreen",
              "drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]",
              "drop-shadow-[0_2px_0_rgba(2,6,23,0.22)]",
              "drop-shadow-[0_0_6px_rgba(50,205,50,0.22)]",
            )}
          >
            {formatMoneyV2(value, currency, locale, {
              fractionDigits: resolvedFractionDigits,
            })}
          </span>

          {suffix ? (
            <span className="text-xs font-semibold text-wizard-text/70 ml-1">
              {suffix}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
};

export default WizardTotalBar;
