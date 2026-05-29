import CalcBird from "@assets/Images/CalcBird.png";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expensesSoulHeroDict } from "@/utils/i18n/pages/private/expenses/ExpensesSoulHero.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { ReactNode } from "react";

import type { ExpenseSummary } from "../utils/expenseSummary";

const ZERO_TOLERANCE = 0.005;

/**
 * Month-over-month expense comparison for the hero pill.
 *
 * The balance card below the hero owns the "kvar efter utgifter" number, so
 * the hero must not repeat it. Instead the pill compares this month's planned
 * expenses with the previous month's total.
 *
 * - `delta` — a real previous month exists and its total is loaded.
 * - `none`  — there is no comparable previous month yet (first month). The
 *             hero shows a quiet neutral state instead of a number.
 * - `null`  — comparison is unknown (e.g. previous month still loading); the
 *             hero hides the pill rather than guess.
 */
export type ExpenseMonthComparison =
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

type ExpensesSoulHeroProps = {
  periodLabel: string;
  summary: ExpenseSummary;
  /** Month-over-month comparison for the hero pill. */
  comparison: ExpenseMonthComparison;
  readOnly: boolean;
  onCreate: () => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function ExpensesSoulHero({
  periodLabel,
  summary,
  comparison,
  readOnly,
  onCreate,
}: ExpensesSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expensesSoulHeroDict.sv>(key: K) =>
    tDict(key, locale, expensesSoulHeroDict);

  // Whole-krona display everywhere on the expenses page (task 2).
  const fmt = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  const totalFormatted = fmt(summary.total);
  const isEmpty = summary.total <= ZERO_TOLERANCE;

  // Qualitative main text — the pill must read as a calm insight, never an
  // alarm, even when the underlying delta is large. The amount, when shown,
  // is demoted to muted secondary text below.
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
  // Secondary, muted amount. Omitted for "level" (≈ no difference) and for
  // the neutral no-previous-month state.
  const comparisonAmountText =
    comparison && comparison.kind === "delta" && comparison.direction !== "level"
      ? fmt(comparison.deltaAbs)
      : null;

  return (
    <section
      data-testid="expenses-soul-hero"
      className={[
        "relative overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/20 bg-eb-surface/90",
        "px-5 py-6 sm:px-8 sm:py-8",
        "shadow-eb backdrop-blur",
        // Clear the sticky app header (h-16) on scroll-into-view / focus.
        "scroll-mt-20 sm:scroll-mt-24",
      ].join(" ")}
    >
      {/* Decorative shell-tinted blobs — match the savings hero / prototype. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[10%] h-44 w-44 rounded-full bg-[rgb(var(--eb-shell)/0.28)] blur-3xl" />
        <div className="absolute -top-24 right-[18%] h-52 w-52 rounded-full bg-[rgb(var(--eb-shell-2)/0.10)] blur-3xl" />
      </div>

      {/* CalcBird mascot, hidden on mobile. Sits in the upper-right with a
        soft halo behind it. `pointer-events-none` so it never blocks the CTA
        underneath. Restated from the prototype's `.hero-mascot` and the
        production savings hero pattern. */}
      <div
        aria-hidden="true"
        data-testid="expenses-hero-mascot"
        className="pointer-events-none absolute right-3 top-[-12px] hidden h-[110px] w-[110px] sm:block lg:right-6 lg:h-[128px] lg:w-[128px]"
      >
        <div
          className="absolute inset-[-14px] blur-md"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, rgb(var(--eb-shell-2) / 0.22) 0%, transparent 72%)",
          }}
        />
        <img
          src={CalcBird}
          alt=""
          // Subtle, slow idle float (3s, ±5px, no bounce) to match the calm
          // "alive" feel of the savings page. `motion-safe:` keeps it off for
          // users who prefer reduced motion; the mascot is hidden below `sm`.
          className="relative h-full w-full object-contain motion-safe:animate-img-float"
        />
      </div>

      <div className="relative z-[1] max-w-[40rem] pr-0 sm:pr-[128px] lg:pr-[148px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/50">
          {t("eyebrow")} · {periodLabel}
        </p>

        <h1
          data-testid="expenses-hero-headline"
          className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text sm:text-[2rem]"
        >
          {isEmpty
            ? t("heroEmptyHeadline")
            : renderHeadline(t("heroHeadline"), totalFormatted)}
        </h1>

        {!isEmpty ? (
          <p
            data-testid="expenses-hero-split"
            className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm text-eb-text/65 sm:text-[15px]"
          >
            {summary.fixedActiveCount > 0 ? (
              <SplitPart
                template={t("splitFixed")}
                amount={fmt(summary.fixedTotal)}
                testId="expenses-hero-split-fixed"
              />
            ) : null}
            {summary.variableActiveCount > 0 ? (
              <>
                {summary.fixedActiveCount > 0 ? <SplitDot /> : null}
                <SplitPart
                  template={t("splitVariable")}
                  amount={fmt(summary.variableTotal)}
                  testId="expenses-hero-split-variable"
                />
              </>
            ) : null}
            {summary.subscriptionActiveCount > 0 ? (
              <>
                {summary.fixedActiveCount > 0 ||
                summary.variableActiveCount > 0 ? (
                  <SplitDot />
                ) : null}
                <SplitPart
                  template={t("splitSubscriptions")}
                  amount={fmt(summary.subscriptionTotal)}
                  testId="expenses-hero-split-subscriptions"
                />
              </>
            ) : null}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {comparisonPillText ? (
            // Calm, neutral pill. Higher spending than last month is not
            // "bad" and lower is not "good", so the pill stays tonally
            // neutral — only a quiet directional glyph hints at the trend.
            <span
              data-testid="expenses-hero-comparison-pill"
              data-direction={comparisonDirection ?? "none"}
              className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/25 bg-eb-surface/70 px-3 py-1.5 text-[13px] font-semibold text-eb-text/70"
            >
              <ComparisonGlyph direction={comparisonDirection} />
              <span>{comparisonPillText}</span>
              {comparisonAmountText ? (
                <span
                  data-testid="expenses-hero-comparison-amount"
                  className="font-normal tabular-nums text-eb-text/40"
                >
                  {comparisonAmountText}
                </span>
              ) : null}
            </span>
          ) : null}
          {readOnly ? (
            <span
              data-testid="expenses-hero-read-only-pill"
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
              data-testid="expenses-hero-create"
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
      </div>
    </section>
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
    // Trending up.
    return (
      <svg {...common}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
    );
  }
  if (direction === "less") {
    // Trending down.
    return (
      <svg {...common}>
        <path d="M3 7l6 6 4-4 8 8" />
        <path d="M17 17h4v-4" />
      </svg>
    );
  }
  if (direction === "level") {
    // On par — flat line.
    return (
      <svg {...common}>
        <path d="M4 12h16" />
      </svg>
    );
  }
  // Neutral "comparison coming soon" — quiet clock.
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
}: {
  template: string;
  amount: string;
  testId?: string;
}): ReactNode {
  const [pre, ...rest] = template.split("{amount}");
  const post = rest.join("{amount}");
  return (
    <span
      data-testid={testId}
      className="inline-flex items-baseline gap-1.5"
    >
      {pre}
      <strong className="font-semibold tabular-nums text-eb-text">
        {amount}
      </strong>
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
