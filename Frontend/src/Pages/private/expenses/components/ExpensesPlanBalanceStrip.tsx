import { cn } from "@/lib/utils";
import type { AppLocale } from "@/types/i18n/appLocale";
import { expensesPlanBalanceStripDict } from "@/utils/i18n/pages/private/expenses/ExpensesPlanBalanceStrip.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useState } from "react";

import type { ExpenseSummary } from "../utils/expenseSummary";

const ZERO_TOLERANCE = 0.005;

export type ExpensesPlanBalanceStripProps = {
  currencyCode: CurrencyCode;
  locale: AppLocale;
  incomeMonthly: number;
  carryOverMonthly: number;
  /**
   * Total expenses for the open month. Should equal {@link summary.total};
   * the caller passes it explicitly so the displayed strip headline reconciles
   * with whichever number the rest of the page treats as the expense headline.
   */
  expensesMonthly: number;
  /** Spend split used for the segmented meter under the breakdown. */
  summary: ExpenseSummary;
};

type ToneKey = "positive" | "zero" | "negative";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function ExpensesPlanBalanceStrip({
  currencyCode,
  locale,
  incomeMonthly,
  carryOverMonthly,
  expensesMonthly,
  summary,
}: ExpensesPlanBalanceStripProps) {
  const t = <K extends keyof typeof expensesPlanBalanceStripDict.sv>(key: K) =>
    tDict(key, locale, expensesPlanBalanceStripDict);

  // Derive remaining from the three terms we display so the breakdown is
  // self-consistent: income + carry-over - expenses = remaining-after-expenses.
  // We deliberately do NOT use dashboardAggregate.summary.remainingToSpend
  // because that already subtracts savings and debts.
  const remainingAfterExpenses =
    incomeMonthly + carryOverMonthly - expensesMonthly;

  const tone: ToneKey =
    remainingAfterExpenses > ZERO_TOLERANCE
      ? "positive"
      : remainingAfterExpenses < -ZERO_TOLERANCE
        ? "negative"
        : "zero";

  const fmt = (value: number) =>
    formatMoneyV2(value, currencyCode, locale, {
      fractionDigits: moneyDecimalsFor(value),
    });

  const absRemaining = Math.abs(remainingAfterExpenses);
  const headline =
    tone === "negative"
      ? interpolate(t("remainingNegative"), { amount: fmt(absRemaining) })
      : tone === "zero"
        ? t("remainingZero")
        : interpolate(t("remainingPositive"), {
            amount: fmt(remainingAfterExpenses),
          });

  const message =
    tone === "negative"
      ? interpolate(t("messageNegative"), { amount: fmt(absRemaining) })
      : tone === "zero"
        ? t("messageZero")
        : interpolate(t("messagePositive"), {
            amount: fmt(remainingAfterExpenses),
          });

  const chip =
    tone === "negative" ? t("chipNegative") : t("chipPositive");

  const breakdown = [
    {
      testIdKey: "income",
      label: t("breakdownIncome"),
      value: incomeMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "carryOver",
      label: t("breakdownCarryOver"),
      value: carryOverMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "expenses",
      label: t("breakdownExpenses"),
      value: -expensesMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "remaining",
      label: t("breakdownRemaining"),
      value: remainingAfterExpenses,
      tone: "highlight" as const,
    },
  ];

  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Segmented meter: parts must add to 100% of the meter width, but if every
  // segment is zero we render a single neutral track so the bar never collapses.
  const meterDenominator = Math.max(summary.total, 1);
  const meterSegments: Array<{
    key: "fixed" | "variable" | "subscription";
    label: string;
    amount: number;
    barClassName: string;
    swatchClassName: string;
  }> = [
    {
      key: "fixed",
      label: t("meterFixed"),
      amount: summary.fixedTotal,
      barClassName: "bg-[rgb(var(--eb-shell-3))]",
      swatchClassName: "bg-[rgb(var(--eb-shell-3))]",
    },
    {
      key: "variable",
      label: t("meterVariable"),
      amount: summary.variableTotal,
      barClassName: "bg-[rgb(var(--eb-accent))]",
      swatchClassName: "bg-[rgb(var(--eb-accent))]",
    },
    {
      key: "subscription",
      label: t("meterSubscriptions"),
      amount: summary.subscriptionTotal,
      barClassName: "bg-[rgb(var(--eb-shell-2))]",
      swatchClassName: "bg-[rgb(var(--eb-shell-2))]",
    },
  ];

  const hasAnySpend = summary.total > ZERO_TOLERANCE;

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
      data-testid="expenses-plan-balance-strip"
      data-tone={tone}
      aria-label={t("title")}
      className={cn(
        "rounded-[1.75rem] border px-4 py-3.5 sm:px-5 sm:py-4",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        containerToneClasses,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-eb-text/50">
            {t("title")}
          </span>
          <div
            data-testid="expenses-plan-balance-headline"
            className={cn(
              "mt-0.5 text-[20px] font-bold tabular-nums tracking-[-0.015em] sm:text-[22px]",
              headlineToneClasses,
            )}
          >
            {headline}
          </div>
        </div>
        <span
          data-testid="expenses-plan-balance-chip"
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold",
            chipToneClasses,
          )}
        >
          {chip}
        </span>
      </div>

      <p
        data-testid="expenses-plan-balance-message"
        className="mt-1.5 text-[13px] text-eb-text/65"
      >
        {message}
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setBreakdownOpen((prev) => !prev)}
          aria-expanded={breakdownOpen}
          aria-controls="expenses-plan-balance-breakdown"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-eb-text/65 transition hover:text-eb-text sm:hidden"
        >
          {breakdownOpen ? t("toggleHide") : t("toggleShow")}
        </button>

        <dl
          id="expenses-plan-balance-breakdown"
          data-testid="expenses-plan-balance-breakdown"
          className={cn(
            "mt-2 grid gap-x-4 gap-y-1.5 sm:mt-3 sm:grid-cols-4",
            breakdownOpen ? "grid" : "hidden sm:grid",
          )}
        >
          {breakdown.map((row) => (
            <div key={row.testIdKey} className="flex flex-col">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-eb-text/45">
                {row.label}
              </dt>
              <dd
                data-testid={`expenses-plan-balance-term-${row.testIdKey}`}
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

        {hasAnySpend ? (
          <div className="mt-4">
            {/* Segmented spend bar — shape comes from the prototype:
              4px gap between segments, fully pilled outer ends, 4px inner
              corners, and a soft inset bottom shadow for depth. The outer
              container is intentionally a plain flex row with `gap-1` (no
              rounded-full / overflow-hidden) so each segment reads as a
              discrete chunk rather than slices of one continuous bar. */}
            {(() => {
              const visibleSegments = meterSegments.filter(
                (segment) => segment.amount > 0,
              );
              return (
                <div
                  data-testid="expenses-spend-meter"
                  role="img"
                  aria-label={t("meterTitle")}
                  className="flex h-3.5 w-full gap-1"
                >
                  {visibleSegments.map((segment, index) => {
                    const widthPct =
                      (segment.amount / meterDenominator) * 100;
                    const isFirst = index === 0;
                    const isLast = index === visibleSegments.length - 1;
                    return (
                      <span
                        key={segment.key}
                        data-testid={`expenses-spend-meter-${segment.key}`}
                        className={cn(
                          "h-full shadow-[inset_0_-1px_0_rgb(15_23_42_/_0.06)]",
                          isFirst ? "rounded-l-full" : "rounded-l",
                          isLast ? "rounded-r-full" : "rounded-r",
                          segment.barClassName,
                        )}
                        style={{ width: `${widthPct}%`, minWidth: "20px" }}
                      />
                    );
                  })}
                </div>
              );
            })()}
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-eb-text/65">
              {meterSegments.map((segment) =>
                segment.amount > 0 ? (
                  <li
                    key={segment.key}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-block h-[8px] w-[8px] rounded-[2px]",
                        segment.swatchClassName,
                      )}
                    />
                    <span>{segment.label}</span>
                    <span className="font-semibold tabular-nums text-eb-text/85">
                      {fmt(segment.amount)}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
