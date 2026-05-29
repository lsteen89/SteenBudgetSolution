import BudgetEditorSegmentedBar from "@/components/molecules/forms/budgetEditor/BudgetEditorSegmentedBar";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/types/i18n/appLocale";
import { incomeDistributionStripDict } from "@/utils/i18n/pages/private/income/IncomeDistributionStrip.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useState } from "react";

const ZERO_TOLERANCE = 0.005;

export type IncomeDistributionStripProps = {
  currencyCode: CurrencyCode;
  locale: AppLocale;
  /** Open-month total income from dashboard / income summary. */
  incomeMonthly: number;
  /** Incoming carry-over from the previous month, kept separate from income. */
  carryOverMonthly: number;
  /** Open-month committed outflows (must reconcile with the dashboard). */
  expensesMonthly: number;
  savingsMonthly: number;
  debtsMonthly: number;
  /**
   * Optional localised label for the previous month (e.g. "april"). Drives
   * the carry-over row label; when null the strip falls back to "förra månaden".
   */
  previousMonthLabel?: string | null;
};

type ToneKey = "positive" | "zero" | "negative";

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

/**
 * Income page distribution strip — `Månadens fördelning`.
 *
 * Renders the full top-of-funnel equation so the user can see what their
 * income has to cover before "Fritt kvar":
 *
 *   income + carryOver - expenses - savings - debts = fritt kvar
 *
 * The strip never invents numbers. Every term is passed in from the dashboard
 * aggregate, and the displayed `Fritt kvar` is derived from those same terms
 * so the breakdown is self-consistent. The segmented bar shows where the
 * income+carry-over pie goes; zero-width segments are omitted from the bar
 * but zero terms still render as `0 kr` in the breakdown, per the design rule.
 */
export default function IncomeDistributionStrip({
  currencyCode,
  locale,
  incomeMonthly,
  carryOverMonthly,
  expensesMonthly,
  savingsMonthly,
  debtsMonthly,
  previousMonthLabel,
}: IncomeDistributionStripProps) {
  const t = <K extends keyof typeof incomeDistributionStripDict.sv>(key: K) =>
    tDict(key, locale, incomeDistributionStripDict);

  // Derive `Fritt kvar` from the same five terms we display so the breakdown
  // reconciles. We deliberately do NOT use `dashboardAggregate.finalBalance`
  // here — letting the strip compute its own end-of-equation number keeps the
  // visible math self-consistent even if dashboard rounding shifts. The page
  // is responsible for passing terms that already match the dashboard.
  const freeToSpend =
    incomeMonthly +
    carryOverMonthly -
    expensesMonthly -
    savingsMonthly -
    debtsMonthly;

  const tone: ToneKey =
    freeToSpend > ZERO_TOLERANCE
      ? "positive"
      : freeToSpend < -ZERO_TOLERANCE
        ? "negative"
        : "zero";

  // Whole-krona display, matching the expense strip + income hero.
  const fmt = (value: number) =>
    formatMoneyV2(value, currencyCode, locale, { fractionDigits: 0 });

  const absFree = Math.abs(freeToSpend);
  const headline =
    tone === "negative"
      ? interpolate(t("headlineNegative"), { amount: fmt(absFree) })
      : tone === "zero"
        ? t("headlineZero")
        : interpolate(t("headlinePositive"), { amount: fmt(freeToSpend) });

  const message =
    tone === "negative"
      ? interpolate(t("messageNegative"), { amount: fmt(absFree) })
      : t("message");

  const chip = tone === "negative" ? t("chipNegative") : t("chipPositive");

  // Carry-over uses the previous-month label when known. Falling back to the
  // generic "förra månaden" is honest when the page has not loaded a
  // previous-month label yet, and avoids inventing a date.
  const carryOverLabel = previousMonthLabel
    ? interpolate(t("breakdownCarryOver"), { month: previousMonthLabel })
    : t("breakdownCarryOverFallback");

  const breakdown = [
    {
      testIdKey: "income",
      label: t("breakdownIncome"),
      value: incomeMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "carryOver",
      label: carryOverLabel,
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
      testIdKey: "savings",
      label: t("breakdownSavings"),
      value: -savingsMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "debts",
      label: t("breakdownDebts"),
      value: -debtsMonthly,
      tone: "neutral" as const,
    },
    {
      testIdKey: "free",
      label: t("breakdownFree"),
      value: freeToSpend,
      tone: "highlight" as const,
    },
  ];

  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Segmented bar segments — `Fritt kvar` is included as its own segment so
  // the bar visualises where 100% of (income + carry-over) goes. When free
  // money is negative we drop the free segment from the bar (it cannot be
  // drawn as a positive width) and let the bar normalise to the visible
  // committed outflows; the headline already carries the shortfall.
  // Use eb-shell-* tokens for committed outflows so the bar reads as part of
  // the funnel chrome, and accent for the positive end so the eye lands on
  // `Fritt kvar` first.
  const meterSegments: Array<{
    key: "expenses" | "savings" | "debts" | "free";
    label: string;
    amount: number;
    barClassName: string;
    swatchClassName: string;
  }> = [
    {
      key: "expenses",
      label: t("meterExpenses"),
      amount: expensesMonthly,
      barClassName: "bg-[rgb(var(--eb-shell-3))]",
      swatchClassName: "bg-[rgb(var(--eb-shell-3))]",
    },
    {
      key: "savings",
      label: t("meterSavings"),
      amount: savingsMonthly,
      barClassName: "bg-[rgb(var(--eb-shell-2))]",
      swatchClassName: "bg-[rgb(var(--eb-shell-2))]",
    },
    {
      key: "debts",
      label: t("meterDebts"),
      amount: debtsMonthly,
      barClassName: "bg-[rgb(var(--eb-shell))]",
      swatchClassName: "bg-[rgb(var(--eb-shell))]",
    },
    {
      key: "free",
      label: t("meterFree"),
      amount: freeToSpend > ZERO_TOLERANCE ? freeToSpend : 0,
      barClassName: "bg-[rgb(var(--eb-accent))]",
      swatchClassName: "bg-[rgb(var(--eb-accent))]",
    },
  ];

  // Denominator: total income + carry-over. The shared segmented bar safely
  // normalises when committed outflows exceed available money.
  const meterDenominator = Math.max(
    incomeMonthly + carryOverMonthly,
    1,
  );

  const hasAnyMoneyToShow =
    incomeMonthly > ZERO_TOLERANCE ||
    carryOverMonthly > ZERO_TOLERANCE ||
    expensesMonthly > ZERO_TOLERANCE ||
    savingsMonthly > ZERO_TOLERANCE ||
    debtsMonthly > ZERO_TOLERANCE;

  const containerToneClasses =
    tone === "negative"
      ? "border-amber-300/70 bg-amber-50/70"
      : "border-eb-stroke/25 bg-eb-surface/65";
  const chipToneClasses =
    tone === "negative"
      ? "bg-amber-100 text-amber-900"
      : "bg-eb-shell/45 text-eb-text/70";
  const headlineToneClasses =
    tone === "negative" ? "text-amber-900" : "text-eb-text";

  return (
    <section
      data-testid="income-distribution-strip"
      data-tone={tone}
      aria-label={t("title")}
      className={cn(
        "rounded-2xl border px-4 py-3 sm:px-5 sm:py-3.5",
        containerToneClasses,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-eb-text/50">
            {t("title")}
          </span>
          <div
            data-testid="income-distribution-headline"
            className={cn(
              "mt-0.5 text-[20px] font-bold tabular-nums tracking-[-0.015em] sm:text-[22px]",
              headlineToneClasses,
            )}
          >
            {headline}
          </div>
        </div>
        <span
          data-testid="income-distribution-chip"
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold",
            chipToneClasses,
          )}
        >
          {chip}
        </span>
      </div>

      <p
        data-testid="income-distribution-message"
        className="mt-1.5 text-[13px] text-eb-text/65"
      >
        {message}
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setBreakdownOpen((prev) => !prev)}
          aria-expanded={breakdownOpen}
          aria-controls="income-distribution-breakdown"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-eb-text/65 transition hover:text-eb-text sm:hidden"
        >
          {breakdownOpen ? t("toggleHide") : t("toggleShow")}
        </button>

        <dl
          id="income-distribution-breakdown"
          data-testid="income-distribution-breakdown"
          className={cn(
            "mt-2 grid gap-x-4 gap-y-1.5 sm:mt-3 sm:grid-cols-3 lg:grid-cols-6",
            breakdownOpen ? "grid" : "hidden sm:grid",
          )}
        >
          {breakdown.map((row) => (
            <div key={row.testIdKey} className="flex flex-col">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-eb-text/45">
                {row.label}
              </dt>
              <dd
                data-testid={`income-distribution-term-${row.testIdKey}`}
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

        {hasAnyMoneyToShow ? (
          <div className="mt-4">
            <div className="mb-1.5 text-[11.5px] text-eb-text/55">
              {t("meterCaption")}
            </div>
            <BudgetEditorSegmentedBar
              segments={meterSegments.map(
                ({ key, label, amount, barClassName }) => ({
                  key,
                  label,
                  amount,
                  barClassName,
                }),
              )}
              denominator={meterDenominator}
              ariaLabel={t("meterTitle")}
              testId="income-distribution-meter"
            />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-eb-text/55">
              {meterSegments.map((segment) =>
                segment.amount > 0 ? (
                  <li
                    key={segment.key}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-block h-[7px] w-[7px] rounded-[2px]",
                        segment.swatchClassName,
                      )}
                    />
                    <span>{segment.label}</span>
                    <span className="font-medium tabular-nums text-eb-text/70">
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
