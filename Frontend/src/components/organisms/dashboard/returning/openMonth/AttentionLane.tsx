import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Info,
  ListChecks,
  Sparkles,
} from "lucide-react";
import React from "react";

import {
  MAX_ATTENTION_ITEMS,
  rankAttentionItems,
  type AttentionActionTarget,
  type AttentionItem,
  type AttentionPillar,
  type AttentionSeverity,
} from "@/domain/budget/attentionRanking";
import type { DashboardSummary } from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { Link } from "react-router-dom";
import { dashboardSurfaceNeutral } from "./dashboardSurface";
import { attentionLaneDict } from "@/utils/i18n/pages/private/dashboard/openMonth/AttentionLane.i18n";
import { tDict } from "@/utils/i18n/translate";

/**
 * AttentionLane (PR4)
 *
 * Replaces the legacy `OpenMonthFollowUpStrip` with a calm, capped, honestly
 * labelled attention lane. The lane:
 *
 *  - Renders at most {@link MAX_ATTENTION_ITEMS} items, all derived from the
 *    existing dashboard summary + the existing close-availability resolver
 *    (no new fetches, no editor-page reads).
 *  - Includes a "How these are chosen" disclosure that says, in every
 *    language, that ranking is on-device guidance — not backend advice
 *    (handover § "Hard Constraints" item 7).
 *  - Routes each item's action to the right place: close-month flow, the
 *    existing pillar quick-drawer, the full editor route, or the breakdown
 *    analysis page.
 *  - Uses calm tones. Deficit copy is factual; positive items do not shout.
 *
 * Read-only (closed/skipped) months never reach this component; the dashboard
 * branches above us. The defensive empty-array fallback in the ranking helper
 * keeps the contract safe regardless.
 */
export interface AttentionLaneProps {
  summary: DashboardSummary;
  closeAvailability: CloseAvailability;
  onCloseMonth: () => void;
  onOpenQuickDrawer: (pillar: AttentionPillar) => void;
  onOpenFullEditor: (pillar: AttentionPillar) => void;
  className?: string;
}

type DictKey = keyof typeof attentionLaneDict.sv;

const SEVERITY_STYLE: Record<
  AttentionSeverity,
  {
    card: string;
    iconWrap: string;
    iconColor: string;
    title: string;
    actionTone: "danger" | "accent" | "neutral" | "positive";
  }
> = {
  critical: {
    card: "border-eb-danger/30 bg-eb-danger/[0.06]",
    iconWrap: "bg-eb-danger/15",
    iconColor: "text-eb-danger",
    title: "text-eb-text",
    actionTone: "danger",
  },
  attention: {
    card: "border-eb-accent/40 bg-eb-accent/[0.08]",
    iconWrap: "bg-eb-accent/15",
    iconColor: "text-eb-accent",
    title: "text-eb-text",
    actionTone: "accent",
  },
  info: {
    card: "border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.32)]",
    iconWrap: "bg-[rgb(var(--eb-shell)/0.6)]",
    iconColor: "text-eb-text/70",
    title: "text-eb-text",
    actionTone: "neutral",
  },
  positive: {
    card: "border-emerald-500/25 bg-emerald-500/[0.07]",
    iconWrap: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    title: "text-eb-text",
    actionTone: "positive",
  },
};

function severityIcon(item: AttentionItem) {
  const className = "h-4 w-4";
  switch (item.id) {
    case "overdue-close":
    case "deficit":
      return <AlertCircle className={className} aria-hidden="true" />;
    case "eligible-close":
      return <Sparkles className={className} aria-hidden="true" />;
    case "close-countdown":
      return <Calendar className={className} aria-hidden="true" />;
    case "large-surplus":
    case "stable-plan":
      return <CheckCircle2 className={className} aria-hidden="true" />;
    default:
      return <Info className={className} aria-hidden="true" />;
  }
}

function interpolate(
  template: string,
  values: Record<string, string | number> | undefined,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key];
    return v === undefined ? "" : String(v);
  });
}

function resolveBody(
  item: AttentionItem,
  t: (key: DictKey) => string,
): string {
  const count =
    typeof item.values?.count === "number"
      ? (item.values.count as number)
      : null;
  // Pluralization is intentionally simple: singular vs other, matching the
  // existing pillar workbench convention.
  if (item.id === "subscriptions-pressure" && count !== null) {
    return interpolate(
      count === 1 ? t("itemSubscriptionsBody") : t("itemSubscriptionsBodyOther"),
      item.values,
    );
  }
  if (item.id === "recurring-pressure" && count !== null) {
    return interpolate(
      count === 1 ? t("itemRecurringBody") : t("itemRecurringBodyOther"),
      item.values,
    );
  }
  return interpolate(t(item.bodyKey as DictKey), item.values);
}

function ActionControl({
  item,
  label,
  tone,
  onCloseMonth,
  onOpenQuickDrawer,
  onOpenFullEditor,
}: {
  item: AttentionItem;
  label: string;
  tone: "danger" | "accent" | "neutral" | "positive";
  onCloseMonth: () => void;
  onOpenQuickDrawer: (pillar: AttentionPillar) => void;
  onOpenFullEditor: (pillar: AttentionPillar) => void;
}) {
  const action: AttentionActionTarget = item.action;
  const baseClasses = cn(
    "group/cta inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50",
    tone === "danger" &&
      "bg-eb-danger/10 text-eb-danger hover:bg-eb-danger/15",
    tone === "accent" &&
      "bg-eb-accent/15 text-eb-accent hover:bg-eb-accent/20",
    tone === "neutral" &&
      "bg-[rgb(var(--eb-shell)/0.6)] text-eb-text hover:bg-[rgb(var(--eb-shell)/0.85)]",
    tone === "positive" &&
      "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20",
  );

  if (action.kind === "open-breakdown") {
    return (
      <Link
        to={appRoutes.dashboardBreakdown}
        className={baseClasses}
        data-testid={`attention-action-${item.id}`}
      >
        <span>{label}</span>
        <ArrowRight className="h-3.5 w-3.5 transition group-hover/cta:translate-x-0.5" />
      </Link>
    );
  }

  const onClick = () => {
    if (action.kind === "close-month") onCloseMonth();
    else if (action.kind === "open-quick-drawer")
      onOpenQuickDrawer(action.pillar);
    else if (action.kind === "open-full-editor")
      onOpenFullEditor(action.pillar);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      data-testid={`attention-action-${item.id}`}
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 transition group-hover/cta:translate-x-0.5" />
    </button>
  );
}

const AttentionLane: React.FC<AttentionLaneProps> = ({
  summary,
  closeAvailability,
  onCloseMonth,
  onOpenQuickDrawer,
  onOpenFullEditor,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends DictKey>(key: K): string =>
    tDict(key, locale, attentionLaneDict);

  const items = React.useMemo(
    () =>
      rankAttentionItems({
        summary,
        closeAvailability,
      }),
    [summary, closeAvailability],
  );

  return (
    <section
      data-testid="attention-lane"
      aria-labelledby="attention-lane-heading"
      className={cn(
        dashboardSurfaceNeutral,
        "px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
    >
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.45)] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-eb-text/65">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {t("sectionEyebrow")}
          </span>
          <h2
            id="attention-lane-heading"
            className="text-base font-bold text-eb-text sm:text-lg"
          >
            {t("sectionTitle")}
          </h2>
          <p className="max-w-xl text-xs leading-5 text-eb-text/60">
            {t("sectionHint")}
          </p>
        </div>
      </header>

      <ul
        className="mt-4 grid gap-3 md:grid-cols-3"
        data-testid="attention-lane-items"
        data-count={items.length}
      >
        {items.map((item) => {
          const style = SEVERITY_STYLE[item.severity];
          return (
            <li
              key={item.id}
              data-testid={`attention-item-${item.id}`}
              data-severity={item.severity}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border px-4 py-3.5 transition",
                style.card,
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    style.iconWrap,
                    style.iconColor,
                  )}
                  aria-hidden="true"
                >
                  {severityIcon(item)}
                </span>
                <div className="flex flex-col gap-1">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-snug",
                      style.title,
                    )}
                  >
                    {t(item.titleKey as DictKey)}
                  </p>
                  <p className="text-xs leading-5 text-eb-text/65">
                    {resolveBody(item, t)}
                  </p>
                </div>
              </div>
              <div className="mt-auto flex justify-end">
                <ActionControl
                  item={item}
                  label={t(item.actionKey as DictKey)}
                  tone={style.actionTone}
                  onCloseMonth={onCloseMonth}
                  onOpenQuickDrawer={onOpenQuickDrawer}
                  onOpenFullEditor={onOpenFullEditor}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <details
        data-testid="attention-lane-how-chosen"
        className="group mt-4 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.22)] px-4 py-2.5 text-xs text-eb-text/65 open:bg-[rgb(var(--eb-shell)/0.32)]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-eb-text/65 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            {t("howChosenLabel")}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <p className="mt-2 leading-5 text-eb-text/65">{t("howChosenBody")}</p>
      </details>
    </section>
  );
};

export default AttentionLane;
