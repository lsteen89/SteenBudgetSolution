import { ArrowRight, Layers } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import {
  classifyRemaining,
  nextYearMonth,
  selectNextMonthRemaining,
  ymLabel,
} from "@/domain/budget/nextMonthPreview";
import { useNextMonthPreviewQuery } from "@/hooks/budget/useNextMonthPreviewQuery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { DashboardPill, ModelCard } from "./DashboardPrimitives";
import { planningRowDict } from "@/utils/i18n/pages/private/dashboard/openMonth/PlanningRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

/**
 * PlanningRow (PR3) — the compact planning layer under the open-month
 * MoneyState hero. Three cards teach the budget model through structure and
 * short labels rather than explanatory prose:
 *
 *   This month  → confirms what is being viewed now; links to the breakdown.
 *   Next month  → the emphasised card; carries the single primary CTA
 *                 ("Review next month" → /dashboard/next-month) and, when the
 *                 backend preview is available, the projected free amount.
 *   Budget plan → names the recurring setup new months start from. No action
 *                 yet — there is no plan-editing route, so it never offers a
 *                 dead link (requirement NM-005).
 *
 * The Next-month figure is never computed here: it comes from the read-only
 * `next-preview` endpoint via {@link selectNextMonthRemaining}, which returns
 * `null` whenever there is no honest number to show. This row is only rendered
 * for the open month, so the preview's from-month is always the active month.
 */
export interface PlanningRowProps {
  /** The active open month (`YYYY-MM`); the preview's from-month. */
  fromYearMonth: string;
  /** This month's backend-owned free balance (`summary.remainingToSpend`). */
  remainingToSpend: number;
  /** Localised label for the active month, e.g. "maj 2026". */
  periodLabel: string;
  currency: CurrencyCode;
  className?: string;
}

type DictKey = keyof typeof planningRowDict.sv;

const PlanningRow: React.FC<PlanningRowProps> = ({
  fromYearMonth,
  remainingToSpend,
  periodLabel,
  currency,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends DictKey>(key: K): string =>
    tDict(key, locale, planningRowDict);

  const previewQ = useNextMonthPreviewQuery(fromYearMonth, {
    enabled: !!fromYearMonth,
  });

  const fmt = (value: number) => {
    const abs = Math.abs(value);
    return formatMoneyV2(abs, currency, locale, {
      fractionDigits: moneyDecimalsFor(abs),
    });
  };

  // ---- Card A: This month -------------------------------------------------
  const thisTone = classifyRemaining(remainingToSpend);

  // ---- Card B: Next month -------------------------------------------------
  const isPreviewLoading = previewQ.isPending;
  const previewRemaining = selectNextMonthRemaining(previewQ.data);
  const hasPreviewNumber = previewRemaining !== null;
  const previewTone = hasPreviewNumber
    ? classifyRemaining(previewRemaining)
    : "zero";
  const nextLabel = ymLabel(
    previewQ.data?.previewYearMonth ?? nextYearMonth(fromYearMonth),
    locale,
  );

  return (
    <section
      data-testid="planning-row"
      aria-label={t("sectionAria")}
      className={cn("grid gap-3 md:grid-cols-3", className)}
    >
      {/* Card A — This month */}
      <ModelCard kicker={t("thisMonthKicker")} testId="planning-card-this-month">
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-base font-extrabold capitalize text-eb-text">
            {periodLabel}
          </span>
          <DashboardPill size="sm" tone="accent">
            {t("openBadge")}
          </DashboardPill>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span
            data-testid="planning-this-amount"
            className={cn(
              "text-xl font-extrabold tabular-nums",
              thisTone === "negative" ? "text-eb-danger" : "text-eb-text",
            )}
          >
            {thisTone === "negative" ? "−" : ""}
            {fmt(remainingToSpend)}
          </span>
          <span className="text-[11.5px] text-eb-text/55">
            {thisTone === "negative" ? t("shortWord") : t("freeNowWord")}
          </span>
        </div>
        <Link
          to={appRoutes.dashboardBreakdown}
          data-testid="planning-see-allocation"
          className="mt-auto inline-flex items-center gap-1.5 self-start pt-3 text-[12.5px] font-bold text-eb-text/60 transition hover:text-eb-text"
        >
          {t("seeAllocation")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </ModelCard>

      {/* Card B — Next month (emphasised, carries the primary CTA) */}
      <ModelCard
        accent
        kicker={t("nextMonthKicker")}
        testId="planning-card-next-month"
      >
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-base font-extrabold capitalize text-eb-text">
            {nextLabel}
          </span>
          {!isPreviewLoading && (
            <DashboardPill size="sm" tone={hasPreviewNumber ? "surface" : "neutral"}>
              {hasPreviewNumber ? t("previewBadge") : t("notOpenedBadge")}
            </DashboardPill>
          )}
        </div>

        {hasPreviewNumber ? (
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              aria-hidden="true"
              className="text-[15px] font-extrabold text-eb-text/55"
            >
              ≈
            </span>
            <span
              data-testid="planning-next-amount"
              className={cn(
                "text-xl font-extrabold tabular-nums",
                previewTone === "negative"
                  ? "text-eb-danger"
                  : previewTone === "positive"
                    ? "text-eb-accent"
                    : "text-eb-text",
              )}
            >
              {previewTone === "negative" ? "−" : ""}
              {fmt(previewRemaining)}
            </span>
            <span className="text-[11.5px] text-eb-text/55">
              {previewTone === "negative"
                ? t("shortIfNothingChanges")
                : t("freeIfNothingChanges")}
            </span>
          </div>
        ) : (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-eb-text/60">
            {isPreviewLoading ? t("checkingPreview") : t("opensOnClose")}
          </p>
        )}

        <div className="mt-auto pt-3">
          <CtaLink
            to={appRoutes.dashboardNextMonth}
            data-testid="planning-next-cta"
            className="h-9 w-full px-3 text-[13px]"
          >
            {t("reviewNextMonth")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CtaLink>
        </div>
      </ModelCard>

      {/* Card C — Budget plan (informational; no plan-editing route yet) */}
      <ModelCard
        kicker={t("budgetPlanKicker")}
        testId="planning-card-budget-plan"
      >
        <div className="mt-1.5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgb(var(--eb-shell)/0.45)] text-eb-text/60"
          >
            <Layers className="h-3.5 w-3.5" />
          </span>
          <span className="text-[14.5px] font-extrabold text-eb-text">
            {t("budgetPlanTitle")}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-eb-text/55">
          {t("budgetPlanBody")}
        </p>
      </ModelCard>
    </section>
  );
};

export default PlanningRow;
