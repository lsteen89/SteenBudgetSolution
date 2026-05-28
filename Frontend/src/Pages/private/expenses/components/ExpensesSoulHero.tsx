import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expensesSoulHeroDict } from "@/utils/i18n/pages/private/expenses/ExpensesSoulHero.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import type { ReactNode } from "react";

import type { ExpenseSummary } from "../utils/expenseSummary";

const ZERO_TOLERANCE = 0.005;

type ExpensesSoulHeroProps = {
  periodLabel: string;
  summary: ExpenseSummary;
  /** Headroom left after expenses: income + carry-over - expenses. */
  remainingAfterExpenses: number;
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
  remainingAfterExpenses,
  readOnly,
  onCreate,
}: ExpensesSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof expensesSoulHeroDict.sv>(key: K) =>
    tDict(key, locale, expensesSoulHeroDict);

  const fmt = (value: number) =>
    formatMoneyV2(value, currency, locale, {
      fractionDigits: moneyDecimalsFor(value),
    });

  const totalFormatted = fmt(summary.total);
  const isEmpty = summary.total <= ZERO_TOLERANCE;

  const remainingNegative = remainingAfterExpenses < -ZERO_TOLERANCE;
  const remainingPillText = remainingNegative
    ? interpolate(t("remainingNegativePill"), {
        amount: fmt(Math.abs(remainingAfterExpenses)),
      })
    : interpolate(t("remainingPill"), {
        amount: fmt(Math.max(0, remainingAfterExpenses)),
      });

  return (
    <section
      data-testid="expenses-soul-hero"
      className={[
        "relative overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/20 bg-eb-surface/85",
        "px-5 py-6 sm:px-8 sm:py-8",
        "shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur",
      ].join(" ")}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[8%] h-44 w-44 rounded-full bg-[rgb(var(--eb-shell)/0.28)] blur-3xl" />
        <div className="absolute -top-24 right-[16%] h-52 w-52 rounded-full bg-[rgb(var(--eb-accent)/0.08)] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 max-w-[40rem]">
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
            <span
              data-testid="expenses-hero-remaining-pill"
              data-tone={remainingNegative ? "negative" : "positive"}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-bold tabular-nums",
                remainingNegative
                  ? "border-amber-300/70 bg-amber-50/80 text-amber-900"
                  : "border-eb-accent/25 bg-eb-accentSoft text-[#14532d]",
              ].join(" ")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>{remainingPillText}</span>
            </span>
            {readOnly ? (
              <span
                data-testid="expenses-hero-read-only-pill"
                className="inline-flex h-9 items-center rounded-full border border-eb-stroke/25 bg-eb-surface px-3 text-sm font-medium text-eb-text/60"
              >
                {t("readOnlyBadge")}
              </span>
            ) : null}
          </div>
        </div>

        {!readOnly ? (
          <div className="flex shrink-0 sm:pt-1">
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
