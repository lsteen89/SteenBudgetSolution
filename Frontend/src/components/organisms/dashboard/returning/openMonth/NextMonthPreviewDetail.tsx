import { ArrowRight, ChevronDown, Info } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

import {
  buildDashboardTerms,
  buildTermsFromLiveDashboard,
} from "@/domain/budget/dashboardTerms";
import {
  buildNextMonthDeltas,
  classifyRemaining,
  isEmptyPlanDashboard,
  selectNextMonthRemaining,
  ymLabel,
  type NextMonthDeltaKey,
} from "@/domain/budget/nextMonthPreview";
import { useNextMonthPreviewQuery } from "@/hooks/budget/useNextMonthPreviewQuery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";
import { nextMonthPreviewDetailDict } from "@/utils/i18n/pages/private/dashboard/openMonth/NextMonthPreviewDetail.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { DashboardPill, dashboardGhostActionClass } from "./DashboardPrimitives";
import { dashboardSurfaceNeutral } from "./dashboardSurface";

/**
 * NextMonthPreviewDetail (PR3) — the dashboard's inline preview surface,
 * rendered directly under the PlanningRow when (and only when) the backend
 * preview has an honest projection to show. It expands the Next-month card's
 * "≈ free" teaser into the blueprint's `deltas` comparison:
 *
 *   - the projected free amount for next month (backend `dashboard` value via
 *     the shared term-builder — never computed here),
 *   - delta chips for the terms that move between this month and next
 *     (pure subtraction of two backend values per term),
 *   - the carry-over assumption line (`preview.carryOver.amount`),
 *   - a "how next month differs" disclosure listing each changed term's
 *     this-month → next-month values,
 *   - a small ghost action to the full preview page.
 *
 * When the preview is unavailable, has no dashboard, or projects an empty
 * budget plan, the component renders nothing — the PlanningRow's Next-month
 * card already carries the factual state line for those cases, and this
 * surface must never fabricate numbers.
 *
 * The blueprint's per-diff reason strings ("Freelance isn't part of your
 * budget plan") are deliberately not implemented: the DTO carries no evidence
 * for them. Only values that exist in the two backend dashboards are shown.
 */
export interface NextMonthPreviewDetailProps {
  /** The active open month (`YYYY-MM`); the preview's from-month. */
  fromYearMonth: string;
  /**
   * Raw current-month dashboard DTO — the same one MoneyState consumes — so
   * the "this month" side of every delta uses backend-authoritative terms.
   */
  dashboardMonth: BudgetDashboardMonthDto;
  currency: CurrencyCode;
  className?: string;
}

type DictKey = keyof typeof nextMonthPreviewDetailDict.sv;

const TERM_LABEL_KEY: Record<NextMonthDeltaKey, DictKey> = {
  income: "termIncome",
  carryOver: "termCarryOver",
  expenses: "termExpenses",
  savings: "termSavings",
  debts: "termDebts",
};

/**
 * Direction tone per term. Colour is only applied where the direction is
 * unambiguous for the month's free money: more income/carry-over is good,
 * more expenses cost money. Savings and debt payments stay neutral — paying
 * yourself or your debts more is not a warning state.
 */
function deltaToneClass(key: NextMonthDeltaKey, delta: number): string {
  const up = delta > 0;
  if (key === "income" || key === "carryOver") {
    return up ? "text-eb-accent" : "text-eb-danger";
  }
  if (key === "expenses") {
    return up ? "text-eb-danger" : "text-eb-accent";
  }
  return "text-eb-text/75";
}

const NextMonthPreviewDetail: React.FC<NextMonthPreviewDetailProps> = ({
  fromYearMonth,
  dashboardMonth,
  currency,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends DictKey>(key: K): string =>
    tDict(key, locale, nextMonthPreviewDetailDict);
  const [diffOpen, setDiffOpen] = React.useState(false);

  const previewQ = useNextMonthPreviewQuery(fromYearMonth, {
    enabled: !!fromYearMonth,
  });
  const preview = previewQ.data;

  // Same honesty gate as selectNextMonthRemaining: no surface at all unless
  // the backend returned a real, non-empty-plan projection.
  const previewRemaining = selectNextMonthRemaining(preview);
  if (
    previewRemaining === null ||
    !preview ||
    preview.state !== "preview" ||
    !preview.dashboard ||
    isEmptyPlanDashboard(preview.dashboard)
  ) {
    return null;
  }

  const fmt = (value: number) => {
    const abs = Math.abs(value);
    return formatMoneyV2(abs, currency, locale, {
      fractionDigits: moneyDecimalsFor(abs),
    });
  };
  const fmtSigned = (value: number) =>
    value < 0 ? `−${fmt(value)}` : `+${fmt(value)}`;

  const currentTerms = buildDashboardTerms(dashboardMonth).terms;
  const nextTerms = buildTermsFromLiveDashboard(preview.dashboard).terms;
  const deltas = buildNextMonthDeltas(currentTerms, nextTerms);
  const visibleChips = deltas.filter((d) => !d.isZero);
  const changesLabel =
    visibleChips.length === 1
      ? t("changesOne")
      : t("changesMany").replace("{count}", String(visibleChips.length));

  const tone = classifyRemaining(previewRemaining);
  const previewMonthLabel = ymLabel(preview.previewYearMonth, locale);
  const fromMonthLabel = ymLabel(preview.fromYearMonth, locale);
  const monthName = monthNameOf(preview.previewYearMonth, locale);
  const heroWord = (
    tone === "negative"
      ? t("shortInMonth")
      : tone === "zero"
        ? t("zeroInMonth")
        : t("freeInMonth")
  ).replace("{month}", monthName);

  const carryCopy = t("carryAssumption")
    .replace("{month}", fromMonthLabel)
    .replace("{amount}", fmt(preview.carryOver.amount));

  return (
    <section
      data-testid="next-month-preview-detail"
      aria-label={t("sectionAria")}
      className={cn(dashboardSurfaceNeutral, "px-5 py-5 sm:px-6", className)}
    >
      {/* Header: kicker · preview pill · period — and the full-preview ghost */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-eb-text/45">
            {t("kicker")}
          </span>
          <DashboardPill size="sm" tone="surface">
            {t("previewBadge")}
          </DashboardPill>
          <span className="text-xs capitalize text-eb-text/50">
            {previewMonthLabel}
          </span>
        </div>
        <Link
          to={appRoutes.dashboardNextMonth}
          data-testid="next-month-preview-detail-open-full"
          className={dashboardGhostActionClass}
        >
          {t("openFullPreview")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Hero: ≈ projected free amount */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span aria-hidden="true" className="text-2xl font-extrabold text-eb-text/50">
          ≈
        </span>
        <span
          data-testid="next-month-preview-detail-amount"
          className={cn(
            "text-3xl font-extrabold leading-none tabular-nums",
            tone === "negative"
              ? "text-eb-danger"
              : tone === "positive"
                ? "text-eb-accent"
                : "text-eb-text",
          )}
        >
          {tone === "negative" ? "−" : ""}
          {fmt(previewRemaining)}
        </span>
        <span className="text-[13.5px] font-bold text-eb-text/55">
          {heroWord}
        </span>
      </div>

      {/* Delta chips — only the terms that actually move */}
      {visibleChips.length > 0 && (
        <ul
          aria-label={t("deltasAria")}
          className="mt-3.5 flex flex-wrap gap-2"
        >
          {visibleChips.map((d) => (
            <li
              key={d.key}
              data-testid={`next-month-preview-detail-delta-${d.key}`}
              className="flex min-w-[96px] flex-col gap-0.5 rounded-xl border border-eb-stroke/40 bg-eb-surface/60 px-3 py-2"
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-eb-text/45">
                {t(TERM_LABEL_KEY[d.key])}
              </span>
              <span
                className={cn(
                  "text-sm font-extrabold tabular-nums",
                  deltaToneClass(d.key, d.delta),
                )}
              >
                {fmtSigned(d.delta)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Carry-over assumption */}
      <div className="mt-3 flex items-start gap-2">
        <Info
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eb-text/45"
        />
        <p
          data-testid="next-month-preview-detail-carry"
          className="text-[11.5px] leading-relaxed text-eb-text/55"
        >
          {carryCopy}
        </p>
      </div>

      {/* How next month differs — changed terms only, this-month → next-month */}
      <div className="mt-3.5 border-t border-eb-stroke/40 pt-3">
        <button
          type="button"
          data-testid="next-month-preview-detail-diff-toggle"
          aria-expanded={diffOpen}
          onClick={() => setDiffOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-[12.5px] font-bold text-eb-text/80">
            {t("diffTitle")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-eb-text/50">
            {changesLabel}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                diffOpen && "rotate-180",
              )}
            />
          </span>
        </button>
        {diffOpen && (
          <dl
            aria-label={t("diffAria")}
            className="mt-2.5 space-y-1.5"
          >
            {visibleChips.map((d) => (
              <div
                key={d.key}
                data-testid={`next-month-preview-detail-diff-row-${d.key}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
              >
                <dt className="text-[12.5px] font-semibold text-eb-text/70">
                  {t(TERM_LABEL_KEY[d.key])}
                </dt>
                <dd className="m-0 flex items-baseline gap-2 text-[12.5px] tabular-nums">
                  <span className="text-eb-text/60">{fmt(d.current)}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3 w-3 self-center text-eb-text/40"
                  />
                  <span className="font-bold text-eb-text">{fmt(d.next)}</span>
                  <span
                    className={cn("font-bold", deltaToneClass(d.key, d.delta))}
                  >
                    {fmtSigned(d.delta)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
};

/** Localized standalone month name ("juni") from a `YYYY-MM` key. */
function monthNameOf(ym: string, locale: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(locale, {
    month: "long",
  });
}

export default NextMonthPreviewDetail;
