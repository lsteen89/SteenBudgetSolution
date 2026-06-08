import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import React from "react";

import {
  resolveCloseBandState,
  type CloseBandKind,
  type CloseBandState,
} from "@/domain/budget/closeBandState";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { dashboardSurfaceBase } from "./dashboardSurface";
import { closeBandDict } from "@/utils/i18n/pages/private/dashboard/openMonth/CloseBand.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

/**
 * CloseBand (PR5) — the conditional close-month band.
 *
 * Sits between MoneyState and AttentionLane in the Spine dashboard. It is the
 * dedicated visual home for "where is this month in its close lifecycle, and
 * what would the next month inherit if I closed now?" — without duplicating
 * the MonthRail ribbon or the AttentionLane close cards.
 *
 * State is resolved by the pure {@link resolveCloseBandState} helper:
 *
 *   - `overdue`   → danger treatment (eb-danger tokens), prominent CTA
 *   - `eligible`  → accent treatment (eb-accent tokens), prominent CTA
 *   - `upcoming`  → quiet status with the existing countdown label
 *   - `absent`    → renders nothing (calm/normal lifecycle, no countdown yet,
 *                   or closed/skipped month — which already branches away
 *                   from this component upstream anyway)
 *
 * Carry-forward preview is `max(remaining, 0)`. Deficit months show `0` with
 * a calm, factual explanation rather than a negative carry-over — closing a
 * deficit month does not push debt forward.
 *
 * The CTA is gated on backend `canCloseMonth`. If the lifecycle reports
 * overdue/eligible but the backend refuses to close, we still show the
 * danger/accent treatment but hide the CTA so the user never clicks into a
 * no-op. This mirrors the AttentionLane precedent.
 *
 * Read-only / closed / skipped months never reach this component in
 * production — the dashboard renders SkippedMonthState or the recap branch.
 * The `absent` branch keeps it safe to call from any context regardless.
 */
export interface CloseBandProps {
  summary: DashboardSummary;
  closeAvailability: CloseAvailability;
  /**
   * Open the existing CloseMonthReviewModal. PR6 wires the actual modal
   * controller — PR5 only ensures the CTA dispatches here when present.
   */
  onOpenCloseMonth: () => void;
  className?: string;
}

type DictKey = keyof typeof closeBandDict.sv;

const TONE_CLASSES: Record<
  Exclude<CloseBandKind, "absent">,
  {
    container: string;
    eyebrowChip: string;
    statusChip: string;
    icon: string;
    iconWrap: string;
    title: string;
    button: string;
  }
> = {
  overdue: {
    container: "border-eb-danger/35 bg-eb-danger/[0.06]",
    eyebrowChip: "border-eb-danger/35 bg-eb-danger/10 text-eb-danger",
    statusChip: "border-eb-danger/35 bg-eb-danger/10 text-eb-danger",
    icon: "text-eb-danger",
    iconWrap: "bg-eb-danger/15",
    title: "text-eb-text",
    button:
      "bg-eb-danger text-white hover:bg-eb-danger/90 focus-visible:ring-eb-danger/40",
  },
  eligible: {
    container: "border-eb-accent/40 bg-eb-accent/[0.06]",
    eyebrowChip: "border-eb-accent/40 bg-eb-accent/10 text-eb-accent",
    statusChip: "border-eb-accent/40 bg-eb-accent/10 text-eb-accent",
    icon: "text-eb-accent",
    iconWrap: "bg-eb-accent/15",
    title: "text-eb-text",
    button:
      "bg-eb-accent text-white hover:bg-eb-accent/90 focus-visible:ring-eb-accent/40",
  },
  upcoming: {
    container: "border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.32)]",
    eyebrowChip:
      "border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.55)] text-eb-text/65",
    statusChip:
      "border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.6)] text-eb-text/65",
    icon: "text-eb-text/65",
    iconWrap: "bg-[rgb(var(--eb-shell)/0.6)]",
    title: "text-eb-text",
    button: "", // upcoming has no CTA
  },
};

function CloseBandIcon({ kind }: { kind: Exclude<CloseBandKind, "absent"> }) {
  const className = "h-4 w-4";
  if (kind === "overdue") {
    return <AlertTriangle className={className} aria-hidden="true" />;
  }
  if (kind === "eligible") {
    return <CheckCircle2 className={className} aria-hidden="true" />;
  }
  return <CalendarClock className={className} aria-hidden="true" />;
}

function eyebrowKey(kind: Exclude<CloseBandKind, "absent">): DictKey {
  if (kind === "overdue") return "eyebrowOverdue";
  if (kind === "eligible") return "eyebrowEligible";
  return "eyebrowUpcoming";
}

function titleKey(kind: Exclude<CloseBandKind, "absent">): DictKey {
  if (kind === "overdue") return "titleOverdue";
  if (kind === "eligible") return "titleEligible";
  return "titleUpcoming";
}

function bodyKey(kind: Exclude<CloseBandKind, "absent">): DictKey {
  if (kind === "overdue") return "bodyOverdue";
  if (kind === "eligible") return "bodyEligible";
  return "bodyUpcoming";
}

function statusKey(kind: Exclude<CloseBandKind, "absent">): DictKey {
  if (kind === "overdue") return "statusLabelOverdue";
  if (kind === "eligible") return "statusLabelEligible";
  return "statusLabelUpcoming";
}

const CloseBand: React.FC<CloseBandProps> = ({
  summary,
  closeAvailability,
  onOpenCloseMonth,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends DictKey>(key: K): string =>
    tDict(key, locale, closeBandDict);

  const state: CloseBandState = React.useMemo(
    () =>
      resolveCloseBandState({
        header: summary.header,
        closeAvailability,
        remaining: summary.finalBalance,
      }),
    [summary.header, summary.finalBalance, closeAvailability],
  );

  if (state.kind === "absent") return null;

  const tone = TONE_CLASSES[state.kind];

  const fmt = (amount: number) =>
    formatMoneyV2(amount, summary.currency, locale, {
      fractionDigits: moneyDecimalsFor(amount),
    });

  const carrySuffixKey: DictKey =
    state.carryForwardTone === "deficit"
      ? "carryForwardSuffixDeficit"
      : state.carryForwardTone === "zero"
        ? "carryForwardSuffixZero"
        : "carryForwardSuffixPositive";

  // For upcoming we use the existing countdown label as a quiet status pill
  // rather than the generic status label. The countdown phrasing already
  // reads naturally as "Månaden kan stängas om N dagar".
  const statusLabel =
    state.kind === "upcoming" ? state.countdownLabel : t(statusKey(state.kind));

  const showCta =
    (state.kind === "overdue" || state.kind === "eligible") &&
    state.canCloseMonth;

  return (
    <section
      data-testid="close-band"
      data-kind={state.kind}
      data-carry-tone={state.carryForwardTone}
      aria-label={t("ariaLabel")}
      aria-live={state.kind === "overdue" ? "polite" : "off"}
      className={cn(
        dashboardSurfaceBase,
        "border px-5 py-5 transition-colors sm:px-6 sm:py-5",
        tone.container,
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone.iconWrap,
              tone.icon,
            )}
            aria-hidden="true"
          >
            <CloseBandIcon kind={state.kind} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                  tone.eyebrowChip,
                )}
              >
                {t(eyebrowKey(state.kind))}
              </span>
              <span
                data-testid="close-band-status-label"
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  tone.statusChip,
                )}
              >
                {statusLabel}
              </span>
            </div>
            <h2
              className={cn(
                "text-base font-bold leading-snug sm:text-lg",
                tone.title,
              )}
            >
              {t(titleKey(state.kind))}
            </h2>
            <p className="max-w-xl text-xs leading-5 text-eb-text/65 sm:text-sm sm:leading-6">
              {t(bodyKey(state.kind))}
            </p>
          </div>
        </div>

        {showCta ? (
          <div className="flex shrink-0 sm:self-center">
            <button
              type="button"
              data-testid="close-band-cta"
              onClick={onOpenCloseMonth}
              className={cn(
                "group/cta inline-flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold shadow-sm transition",
                "focus-visible:outline-none focus-visible:ring-4",
                tone.button,
              )}
            >
              <span>{t("actionReviewAndClose")}</span>
              <ArrowRight
                className="h-4 w-4 transition group-hover/cta:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        ) : null}
      </div>

      <div
        data-testid="close-band-carry-forward"
        className="mt-4 flex flex-col gap-1.5 rounded-2xl border border-eb-stroke/25 bg-eb-surface/60 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
          {t("carryForwardLabel")}
        </span>
        <span
          data-testid="close-band-carry-amount"
          className={cn(
            "text-base font-extrabold tabular-nums sm:text-lg",
            state.carryForwardTone === "deficit"
              ? "text-eb-danger"
              : state.carryForwardTone === "zero"
                ? "text-eb-text/70"
                : "text-eb-text",
          )}
        >
          {fmt(state.carryForwardPreview)}
        </span>
        <span className="text-xs leading-5 text-eb-text/65 sm:text-sm">
          {t(carrySuffixKey)}
        </span>
      </div>

      {(state.kind === "overdue" || state.kind === "eligible") &&
      !state.canCloseMonth ? (
        <p
          data-testid="close-band-disabled-hint"
          className="mt-3 text-xs leading-5 text-eb-text/60"
        >
          {t("actionDisabledReason")}
        </p>
      ) : null}
    </section>
  );
};

export default CloseBand;
