import BudgetEditorHeroShell from "@/components/molecules/forms/budgetEditor/BudgetEditorHeroShell";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { incomeSoulHeroDict } from "@/utils/i18n/pages/private/income/IncomeSoulHero.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { ReactNode } from "react";

import type { IncomeSummary } from "../utils/buildIncomeSummary";

const ZERO_TOLERANCE = 0.005;

/**
 * Month-over-month income comparison for the hero pill.
 *
 * Mirrors the expense hero shape but inverts the tonal grammar: more income
 * is positive, less income is negative. The pill remains a calm insight —
 * never an alarm — so the direction glyph and a muted amount carry the
 * signal rather than colour.
 *
 *   - `delta`  — a real previous month exists and its income total is known.
 *   - `none`   — no comparable previous month yet (first budgeted month).
 *   - `null`   — comparison unknown (loading / not usable); hide the pill.
 */
export type IncomeMonthComparison =
  | {
      kind: "delta";
      direction: "more" | "less" | "level";
      /** Absolute difference, always >= 0. */
      deltaAbs: number;
      /** Localised previous-month name, e.g. "april". */
      previousLabel: string;
    }
  | { kind: "none" }
  | null;

type IncomeSoulHeroProps = {
  periodLabel: string;
  summary: IncomeSummary;
  /**
   * `Fritt kvar` for the open month, sourced from the dashboard aggregate
   * (`finalBalanceWithCarryMonthly`). Honest only when dashboard data has
   * loaded; the page must gate the hero on that load.
   */
  freeToSpend: number;
  comparison: IncomeMonthComparison;
  readOnly: boolean;
  onCreate: () => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function IncomeSoulHero({
  periodLabel,
  summary,
  freeToSpend,
  comparison,
  readOnly,
  onCreate,
}: IncomeSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof incomeSoulHeroDict.sv>(key: K) =>
    tDict(key, locale, incomeSoulHeroDict);

  // Whole-krona display, matching the expense hero so siblings read as one
  // grammar (no surprise cents in one place, kronor in the other).
  const fmt = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  const totalFormatted = fmt(summary.total);
  const isEmpty = summary.total <= ZERO_TOLERANCE;

  // The split renders only kinds that actually exist this month and an
  // honest `Fritt kvar` term computed by the page. Negative `Fritt kvar`
  // switches to the "saknas" phrasing so we never imply free money exists
  // when committed outflows exceed available money — calm warn, never red
  // on the income side.
  const freeIsNegative = freeToSpend < -ZERO_TOLERANCE;
  const freeAbs = Math.abs(freeToSpend);
  const freeTemplate = freeIsNegative
    ? t("splitFreeNegative")
    : t("splitFree");

  // Hero pill comparison — see `IncomeMonthComparison`. Higher income is
  // positive, lower income is negative — but the pill stays tonally calm.
  const comparisonPillText =
    comparison === null
      ? null
      : comparison.kind === "none"
        ? t("comparisonNone")
        : interpolate(
            comparison.direction === "more"
              ? t("comparisonMore")
              : comparison.direction === "less"
                ? t("comparisonLess")
                : t("comparisonLevel"),
            { month: comparison.previousLabel },
          );
  const comparisonDirection =
    comparison && comparison.kind === "delta" ? comparison.direction : null;
  const comparisonAmountText =
    comparison && comparison.kind === "delta" && comparison.direction !== "level"
      ? fmt(comparison.deltaAbs)
      : null;

  return (
    <BudgetEditorHeroShell
      testId="income-soul-hero"
      mascotTestId="income-hero-mascot"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/50">
        {t("eyebrow")} · {periodLabel}
      </p>

      <h1
        data-testid="income-hero-headline"
        className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text sm:text-[2rem]"
      >
        {isEmpty
          ? t("heroEmptyHeadline")
          : renderHeadline(t("heroHeadline"), totalFormatted)}
      </h1>

      {!isEmpty ? (
        <p
          data-testid="income-hero-split"
          className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm text-eb-text/65 sm:text-[15px]"
        >
          {summary.salaryActiveCount > 0 ? (
            <SplitPart
              template={t("splitSalary")}
              amount={fmt(summary.salaryTotal)}
              testId="income-hero-split-salary"
            />
          ) : null}
          {summary.householdActiveCount > 0 ? (
            <>
              {summary.salaryActiveCount > 0 ? <SplitDot /> : null}
              <SplitPart
                template={t("splitHousehold")}
                amount={fmt(summary.householdTotal)}
                testId="income-hero-split-household"
              />
            </>
          ) : null}
          {summary.sideHustleActiveCount > 0 ? (
            <>
              {summary.salaryActiveCount > 0 ||
              summary.householdActiveCount > 0 ? (
                <SplitDot />
              ) : null}
              <SplitPart
                template={t("splitSideHustle")}
                amount={fmt(summary.sideHustleTotal)}
                testId="income-hero-split-sideHustle"
              />
            </>
          ) : null}
          {/* Always include `Fritt kvar` so the funnel grammar is visible
            even when only salary exists. The page passes a freeToSpend
            derived from real dashboard totals; this component never invents
            a number, but it does render zero as `0 kr` per the design rule
            that zero terms still appear. */}
          {summary.salaryActiveCount > 0 ||
          summary.householdActiveCount > 0 ||
          summary.sideHustleActiveCount > 0 ? (
            <SplitDot />
          ) : null}
          <SplitPart
            template={freeTemplate}
            amount={fmt(freeAbs)}
            testId="income-hero-split-free"
            highlight={freeIsNegative ? "warn" : "positive"}
          />
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {comparisonPillText ? (
          // Calm neutral pill. Direction glyph carries the trend so the
          // pill colour stays consistent across more/less/level.
          <span
            data-testid="income-hero-comparison-pill"
            data-direction={comparisonDirection ?? "none"}
            className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/25 bg-eb-surface/70 px-3 py-1.5 text-[13px] font-semibold text-eb-text/70"
          >
            <ComparisonGlyph direction={comparisonDirection} />
            <span>{comparisonPillText}</span>
            {comparisonAmountText ? (
              <span
                data-testid="income-hero-comparison-amount"
                className="font-normal tabular-nums text-eb-text/40"
              >
                {comparisonAmountText}
              </span>
            ) : null}
          </span>
        ) : null}
        {readOnly ? (
          <span
            data-testid="income-hero-read-only-pill"
            className="inline-flex h-9 items-center rounded-full border border-eb-stroke/25 bg-eb-surface px-3 text-sm font-medium text-eb-text/60"
          >
            {t("readOnlyBadge")}
          </span>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreate}
            data-testid="income-hero-create"
            className={[
              "inline-flex items-center gap-2 rounded-full",
              "bg-eb-accent px-5 py-2.5 text-sm font-semibold text-white",
              "shadow-eb transition",
              "hover:bg-eb-accent/90 focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-eb-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-eb-surface",
            ].join(" ")}
          >
            {t("create")}
          </button>
        </div>
      ) : null}
    </BudgetEditorHeroShell>
  );
}

function ComparisonGlyph({
  direction,
}: {
  direction: "more" | "less" | "level" | null;
}) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "text-eb-text/45",
  };

  if (direction === "more") {
    return (
      <svg {...common}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    );
  }
  if (direction === "less") {
    return (
      <svg {...common}>
        <path d="M3 7l6 6 4-4 8 8" />
        <path d="M17 17h4v-4" />
      </svg>
    );
  }
  if (direction === "level") {
    return (
      <svg {...common}>
        <path d="M4 12h16" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SplitDot() {
  return (
    <span
      aria-hidden="true"
      className="h-1 w-1 self-center rounded-full bg-eb-text/30"
    />
  );
}

function SplitPart({
  template,
  amount,
  testId,
  highlight,
}: {
  template: string;
  amount: string;
  testId?: string;
  /**
   * `positive` paints the amount in `eb-accent` (income/free money is good).
   * `warn` paints a calm amber for `Fritt kvar` shortfalls — never red, since
   * red is reserved for destructive actions on the income page.
   */
  highlight?: "positive" | "warn";
}): ReactNode {
  const [pre, ...rest] = template.split("{amount}");
  const post = rest.join("{amount}");
  const amountClass =
    highlight === "warn"
      ? "font-semibold tabular-nums text-amber-700"
      : highlight === "positive"
        ? "font-semibold tabular-nums text-eb-accent"
        : "font-semibold tabular-nums text-eb-text";
  return (
    <span
      data-testid={testId}
      className="inline-flex items-baseline gap-1.5"
    >
      {pre}
      <strong className={amountClass}>{amount}</strong>
      {post}
    </span>
  );
}

function renderHeadline(template: string, amount: string) {
  const parts = template.split("{amount}");
  if (parts.length < 2) return template;
  return (
    <>
      {parts[0]}
      <span className="text-eb-accent">{amount}</span>
      {parts.slice(1).join("{amount}")}
    </>
  );
}
