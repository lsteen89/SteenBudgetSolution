import { ArrowRight } from "lucide-react";
import React from "react";

import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import AllocationBar, {
  ALLOCATION_SEGMENT_BAR_CLASS,
  getVisibleAllocationSegments,
  type AllocationBarLabels,
  type AllocationSegmentKey,
} from "@/components/molecules/budget/AllocationBar";
import {
  buildDashboardTerms,
  type DashboardTermsResult,
} from "@/domain/budget/dashboardTerms";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import { moneyStateDict } from "@/utils/i18n/pages/private/dashboard/openMonth/MoneyState.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

/**
 * MoneyState — the inline money-state anchor for an open month.
 *
 * Answers two questions the dashboard must answer (designer-handoff §
 * "Product Direction"):
 *   1. How much money is left this month?
 *   2. Why is that the number?
 *
 * The big "remaining" value is the backend-authoritative
 * `finalBalanceWithCarryMonthly` (via `buildDashboardTerms`). The component
 * never re-derives remaining from its own equation sum — that would let the
 * UI silently disagree with the backend on what the user has left. The
 * client-side sum is exposed only through `DashboardTermsResult.reconciles`
 * for diagnostics: when it drifts, we `console.warn` and keep rendering the
 * backend number.
 *
 * The inline 6-term equation makes the reasoning visible. Carry-over is
 * rendered even when zero, because the README locks it as its own equation
 * term (never folded into income).
 *
 * The AllocationBar molecule shows the planned split across expenses,
 * savings, debts and free room (or where money runs out in a deficit).
 *
 * Read-only / closed / skipped months are handled upstream — they bypass
 * `ReturningDashboardSection` entirely. This component therefore assumes the
 * month is open. It is safe to render against any open `BudgetDashboardMonthDto`,
 * including zero-state months (no income, no commitments).
 */
export interface MoneyStateProps {
  dashboardMonth: BudgetDashboardMonthDto;
  currency: CurrencyCode;
  /**
   * Optional className for the outer section, so the parent can compose
   * spacing without leaking layout concerns into MoneyState itself.
   */
  className?: string;
}

type RemainingTone = "positive" | "zero" | "negative";

const REMAINING_EPSILON = 0.005;

function classifyRemaining(remaining: number): RemainingTone {
  if (remaining > REMAINING_EPSILON) return "positive";
  if (remaining < -REMAINING_EPSILON) return "negative";
  return "zero";
}

const MoneyState: React.FC<MoneyStateProps> = ({
  dashboardMonth,
  currency,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof moneyStateDict.sv>(key: K): string =>
    tDict(key, locale, moneyStateDict);

  const result: DashboardTermsResult = React.useMemo(
    () => buildDashboardTerms(dashboardMonth),
    [dashboardMonth],
  );
  const { terms, reconciles, reconcileDelta } = result;

  // Reconciliation is for diagnostics only. We never display
  // `computedRemaining` — the backend value is the source of truth so the
  // anchor and the bar never disagree about what is left.
  React.useEffect(() => {
    if (!reconciles) {
      // eslint-disable-next-line no-console
      console.warn(
        "[MoneyState] Dashboard six-term equation does not reconcile with backend remaining.",
        {
          yearMonth: dashboardMonth.month.yearMonth,
          reconcileDelta,
          terms,
        },
      );
    }
  }, [reconciles, reconcileDelta, dashboardMonth.month.yearMonth, terms]);

  const tone = classifyRemaining(terms.remaining);
  const remainingMagnitude = Math.abs(terms.remaining);
  const remainingLabel = formatMoneyV2(remainingMagnitude, currency, locale, {
    fractionDigits: moneyDecimalsFor(remainingMagnitude),
  });

  const formatTermValue = (value: number) => {
    const abs = Math.abs(value);
    return formatMoneyV2(abs, currency, locale, {
      fractionDigits: moneyDecimalsFor(abs),
    });
  };

  const helperCopy =
    tone === "positive"
      ? t("helperPositive")
      : tone === "negative"
        ? t("helperNegative")
        : t("helperZero");

  const allocationLabels: AllocationBarLabels = {
    ariaLabel: t("allocationAria"),
    expenses: t("allocationExpenses"),
    savings: t("allocationSavings"),
    debts: t("allocationDebts"),
    free: t("allocationFree"),
    unfunded: t("allocationUnfunded"),
    runsOutMarker: t("allocationRunsOut"),
  };

  const allocationTerms = {
    expenses: terms.expenses,
    savings: terms.savings,
    debts: terms.debts,
    remaining: terms.remaining,
  };
  // Legend mirrors exactly the segments the bar draws (helper shared with
  // AllocationBar), so a dot/label/amount can never drift from the bar.
  const legendSegments = getVisibleAllocationSegments(allocationTerms);
  const segmentLabel: Record<AllocationSegmentKey, string> = {
    expenses: allocationLabels.expenses,
    savings: allocationLabels.savings,
    debts: allocationLabels.debts,
    free: allocationLabels.free,
  };

  // Six terms in canonical order. Carry-over keeps its slot even at 0 so the
  // equation reads honestly. The first term has no operator; subsequent
  // operators are dictated by the equation, not by sign of the term.
  const equationTerms: Array<{
    key: string;
    label: string;
    value: number;
    operator: "plus" | "minus" | null;
  }> = [
    { key: "income", label: t("equationIncome"), value: terms.income, operator: null },
    {
      key: "carryOver",
      label: t("equationCarryOver"),
      value: terms.carryOver,
      operator: "plus",
    },
    {
      key: "expenses",
      label: t("equationExpenses"),
      value: terms.expenses,
      operator: "minus",
    },
    {
      key: "savings",
      label: t("equationSavings"),
      value: terms.savings,
      operator: "minus",
    },
    {
      key: "debts",
      label: t("equationDebts"),
      value: terms.debts,
      operator: "minus",
    },
  ];

  const remainingToneClass =
    tone === "negative"
      ? "text-eb-danger"
      : tone === "zero"
        ? "text-eb-text"
        : "text-eb-text";

  return (
    <section
      data-testid="money-state"
      data-tone={tone}
      aria-labelledby="money-state-heading"
      className={cn(
        "overflow-hidden rounded-[2rem] border border-eb-stroke/30 bg-eb-surface px-5 py-6 shadow-eb sm:px-7 sm:py-7",
        tone === "negative" && "border-eb-danger/30",
        className,
      )}
    >
      <header className="flex flex-col gap-1.5">
        <span className="inline-flex w-fit items-center rounded-full border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.45)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-eb-text/65">
          {t("eyebrow")}
        </span>
        <p
          id="money-state-heading"
          className="mt-1 text-xs font-semibold uppercase tracking-wide text-eb-text/55"
        >
          {t("remainingLabel")}
        </p>
        <p
          data-testid="money-state-remaining"
          className={cn(
            "text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
            remainingToneClass,
          )}
        >
          {tone === "negative" ? "−" : ""}
          {remainingLabel}
        </p>
        <p className="mt-1 max-w-xl text-sm leading-6 text-eb-text/70">
          {helperCopy}
        </p>
      </header>

      <div
        data-testid="money-state-equation"
        role="group"
        aria-label={t("equationAriaLabel")}
        className="mt-5 flex flex-wrap items-stretch gap-2"
      >
        {equationTerms.map((term) => (
          <React.Fragment key={term.key}>
            {term.operator ? (
              <span
                aria-hidden="true"
                className="self-center text-base font-semibold text-eb-text/50"
              >
                {term.operator === "plus" ? t("equationPlus") : t("equationMinus")}
              </span>
            ) : null}
            <span
              data-testid={`money-state-equation-${term.key}`}
              className={cn(
                "inline-flex min-w-0 flex-col rounded-2xl border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.35)] px-3 py-2",
                term.key === "carryOver" &&
                  Math.abs(term.value) < REMAINING_EPSILON &&
                  "opacity-70",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
                {term.label}
              </span>
              <span className="text-sm font-semibold tabular-nums text-eb-text">
                {formatTermValue(term.value)}
              </span>
            </span>
          </React.Fragment>
        ))}
        <span
          aria-hidden="true"
          className="self-center text-base font-semibold text-eb-text/50"
        >
          {t("equationEquals")}
        </span>
        <span
          data-testid="money-state-equation-remaining"
          className={cn(
            "inline-flex min-w-0 flex-col rounded-2xl border px-3 py-2",
            tone === "negative"
              ? "border-eb-danger/40 bg-eb-danger/10"
              : "border-eb-accent/30 bg-eb-accent/10",
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/65">
            {t("equationRemaining")}
          </span>
          <span
            className={cn(
              "text-sm font-extrabold tabular-nums",
              tone === "negative" ? "text-eb-danger" : "text-eb-text",
            )}
          >
            {tone === "negative" ? "−" : ""}
            {formatTermValue(terms.remaining)}
          </span>
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
          {t("allocationCaption")}
        </p>
        {legendSegments.length > 0 ? (
          <ul
            data-testid="money-state-allocation-legend"
            className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5"
          >
            {legendSegments.map((segment) => (
              <li
                key={segment.key}
                data-testid={`money-state-allocation-legend-${segment.key}`}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-[3px]",
                    ALLOCATION_SEGMENT_BAR_CLASS[segment.key],
                  )}
                />
                <span className="text-[11px] font-semibold text-eb-text/60">
                  {segmentLabel[segment.key]}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-eb-text">
                  {formatTermValue(segment.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2.5">
          <AllocationBar
            terms={allocationTerms}
            labels={allocationLabels}
            testId="money-state-allocation"
          />
        </div>
      </div>

      <footer className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-eb-text/55">
          {t("breakdownHint")}
        </p>
        <CtaLink
          to={appRoutes.dashboardBreakdown}
          data-testid="money-state-breakdown-link"
          className="h-11 justify-center rounded-2xl px-4 sm:w-auto"
        >
          <span>{t("breakdownLink")}</span>
          <ArrowRight className="h-4 w-4" />
        </CtaLink>
      </footer>
    </section>
  );
};

export default MoneyState;
