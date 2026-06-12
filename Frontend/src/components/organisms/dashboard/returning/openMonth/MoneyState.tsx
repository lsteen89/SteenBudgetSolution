import { ArrowRight } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

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
import { dashboardGhostActionClass } from "./DashboardPrimitives";
import { dashboardSurfaceNeutral } from "./dashboardSurface";
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
 * backend number. The six-term equation itself is no longer rendered (V2
 * PR2); the flow bar + legend is the single visible "why".
 *
 * The remaining number is the page hero, with a terse tone word beside it
 * ("free to allocate" / "fully assigned" / "short"), under an
 * `Open month · {date range}` kicker. Below a divider, the allocation
 * section pairs the legend + segmented flow bar with a small ghost
 * "Breakdown" action to the full breakdown page.
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

/**
 * Locale-formatted first–last date range for a `YYYY-MM` key, e.g.
 * "1–31 maj" (sv) / "May 1 – 31" (en-US). Label-only — never used for money.
 */
function ymDateRange(ym: string, locale: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return "";
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).formatRange(first, last);
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

  // Terse tone word shown inline next to the hero number ("free to allocate" /
  // "fully assigned" / "short"). The helper sentence below it carries the
  // fuller explanation; this is the at-a-glance read.
  const toneWord =
    tone === "positive"
      ? t("toneWordPositive")
      : tone === "negative"
        ? t("toneWordNegative")
        : t("toneWordZero");

  const dateRange = ymDateRange(dashboardMonth.month.yearMonth, locale);

  const allocationLabels: AllocationBarLabels = {
    ariaLabel: t("allocationAria"),
    expenses: t("allocationExpenses"),
    savings: t("allocationSavings"),
    debts: t("allocationDebts"),
    free: t("allocationFree"),
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

  const remainingToneClass =
    tone === "negative" ? "text-eb-danger" : "text-eb-text";

  return (
    <section
      data-testid="money-state"
      data-tone={tone}
      aria-labelledby="money-state-heading"
      className={cn(
        dashboardSurfaceNeutral,
        "px-5 py-6 sm:px-7 sm:py-7",
        tone === "negative" && "border-eb-danger/40",
        className,
      )}
    >
      <header className="flex flex-col">
        <p
          id="money-state-heading"
          data-testid="money-state-kicker"
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-eb-text/45"
        >
          {t("kickerOpenMonth")}
          {dateRange ? <> &middot; {dateRange}</> : null}
        </p>
        {/*
          The remaining number is the page's primary answer, so it reads as the
          dominant element. The tone word sits beside it on a baseline (and
          wraps below on narrow screens) so the glanceable verdict travels with
          the figure without crowding it.
        */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p
            data-testid="money-state-remaining"
            className={cn(
              "text-[2.75rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-6xl",
              remainingToneClass,
            )}
          >
            {tone === "negative" ? "−" : ""}
            {remainingLabel}
          </p>
          <p
            data-testid="money-state-tone-word"
            className={cn(
              "text-base font-bold sm:text-lg",
              tone === "negative" ? "text-eb-danger" : "text-eb-text/55",
            )}
          >
            {toneWord}
          </p>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-eb-text/70">
          {helperCopy}
        </p>
      </header>

      <div className="mt-4 border-t border-eb-stroke/40 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-eb-text/45">
            {t("allocationCaption")}
          </p>
          <Link
            to={appRoutes.dashboardBreakdown}
            data-testid="money-state-breakdown-link"
            className={dashboardGhostActionClass}
          >
            <span>{t("breakdownLink")}</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
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
    </section>
  );
};

export default MoneyState;
