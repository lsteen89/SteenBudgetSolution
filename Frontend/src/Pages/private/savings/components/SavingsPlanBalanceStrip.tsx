import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { AppLocale } from "@/types/i18n/appLocale";
import { useState } from "react";

const ZERO_TOLERANCE = 0.005; // 1/2 cent — anything tighter is just float dust.

export type SavingsPlanBalanceStripProps = {
  currencyCode: CurrencyCode;
  locale: AppLocale;
  incomeMonthly: number;
  carryOverMonthly: number;
  expensesMonthly: number;
  /** Steady base monthly savings (Savings.MonthlySavings). */
  baseSavingsMonthly: number;
  /** Sum of active goal monthly contributions. */
  goalSavingsMonthly: number;
  debtPaymentsMonthly: number;
};

type ToneKey = "positive" | "zero" | "negative";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsPlanBalanceStrip({
  currencyCode,
  locale,
  incomeMonthly,
  carryOverMonthly,
  expensesMonthly,
  baseSavingsMonthly,
  goalSavingsMonthly,
  debtPaymentsMonthly,
}: SavingsPlanBalanceStripProps) {
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  // The dashboard's remaining-to-spend nets out base savings, expenses and
  // debts but NOT goal contributions — so it cannot be the source of truth for
  // "kvar" on this page. Derive it from the six terms we display, so the
  // breakdown always visibly adds up and the hero (base + goals) agrees.
  const honestRemaining =
    incomeMonthly +
    carryOverMonthly -
    expensesMonthly -
    baseSavingsMonthly -
    goalSavingsMonthly -
    debtPaymentsMonthly;

  const tone: ToneKey =
    honestRemaining > ZERO_TOLERANCE
      ? "positive"
      : honestRemaining < -ZERO_TOLERANCE
        ? "negative"
        : "zero";

  const fmt = (value: number) =>
    formatMoneyV2(value, currencyCode, locale, {
      fractionDigits: moneyDecimalsFor(value),
    });

  const absRemaining = Math.abs(honestRemaining);
  const headline =
    tone === "negative"
      ? interpolate(t("planBalanceRemainingNegative"), {
          amount: fmt(absRemaining),
        })
      : tone === "zero"
        ? t("planBalanceRemainingZero")
        : interpolate(t("planBalanceRemainingPositive"), {
            amount: fmt(honestRemaining),
          });

  const message =
    tone === "negative"
      ? interpolate(t("planBalanceMessageNegative"), {
          amount: fmt(absRemaining),
        })
      : tone === "zero"
        ? t("planBalanceMessageZero")
        : interpolate(t("planBalanceMessagePositive"), {
            amount: fmt(honestRemaining),
          });

  const chip =
    tone === "negative"
      ? t("planBalanceChipNegative")
      : t("planBalanceChipPositive");

  const breakdown = [
    {
      label: t("planBalanceBreakdownIncome"),
      value: incomeMonthly + carryOverMonthly,
      tone: "neutral" as const,
    },
    {
      label: t("planBalanceBreakdownExpenses"),
      value: -expensesMonthly,
      tone: "neutral" as const,
    },
    {
      label: t("planBalanceBreakdownBaseSavings"),
      value: -baseSavingsMonthly,
      tone: "neutral" as const,
      dotClassName: "bg-[rgb(var(--eb-shell-2)/0.5)]",
    },
    {
      label: t("planBalanceBreakdownGoalSavings"),
      value: -goalSavingsMonthly,
      tone: "neutral" as const,
      dotClassName: "bg-[rgb(var(--eb-accent))]",
    },
    {
      label: t("planBalanceBreakdownDebts"),
      value: -debtPaymentsMonthly,
      tone: "neutral" as const,
    },
    {
      label: t("planBalanceBreakdownRemaining"),
      value: honestRemaining,
      tone: "highlight" as const,
    },
  ];

  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const containerToneClasses =
    tone === "negative"
      ? "border-amber-300/70 bg-amber-50/70"
      : "border-eb-stroke/30 bg-eb-surface/85";
  const chipToneClasses =
    tone === "negative"
      ? "bg-amber-100 text-amber-900"
      : "bg-eb-shell/45 text-eb-text/70";
  const headlineToneClasses =
    tone === "negative" ? "text-amber-900" : "text-eb-text";

  return (
    <section
      data-testid="savings-plan-balance-strip"
      data-tone={tone}
      aria-label={t("planBalanceTitle")}
      className={cn(
        "rounded-[1.75rem] border px-4 py-3.5 sm:px-5 sm:py-4",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        containerToneClasses,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-eb-text/50">
            {t("planBalanceTitle")}
          </span>
          <div
            className={cn(
              "mt-0.5 text-[20px] font-bold tabular-nums tracking-[-0.015em] sm:text-[22px]",
              headlineToneClasses,
            )}
            data-testid="savings-plan-balance-headline"
          >
            {headline}
          </div>
        </div>
        <span
          data-testid="savings-plan-balance-chip"
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold",
            chipToneClasses,
          )}
        >
          {chip}
        </span>
      </div>

      <p
        className="mt-1.5 text-[13px] text-eb-text/65"
        data-testid="savings-plan-balance-message"
      >
        {message}
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setBreakdownOpen((prev) => !prev)}
          aria-expanded={breakdownOpen}
          aria-controls="savings-plan-balance-breakdown"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-eb-text/65 transition hover:text-eb-text sm:hidden"
        >
          {breakdownOpen
            ? t("planBalanceToggleHide")
            : t("planBalanceToggleShow")}
        </button>

        <dl
          id="savings-plan-balance-breakdown"
          data-testid="savings-plan-balance-breakdown"
          className={cn(
            "mt-2 grid gap-x-4 gap-y-1.5 sm:mt-3 sm:grid-cols-6",
            breakdownOpen ? "grid" : "hidden sm:grid",
          )}
        >
          {breakdown.map((row) => (
            <div key={row.label} className="flex flex-col">
              <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-eb-text/45">
                {row.label}
                {"dotClassName" in row && row.dotClassName ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block h-[7px] w-[7px] rounded-[2px]",
                      row.dotClassName,
                    )}
                  />
                ) : null}
              </dt>
              <dd
                className={cn(
                  "text-[14px] font-semibold tabular-nums",
                  row.tone === "highlight"
                    ? tone === "negative"
                      ? "text-amber-900"
                      : "text-eb-text"
                    : "text-eb-text/80",
                )}
              >
                {fmt(row.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
