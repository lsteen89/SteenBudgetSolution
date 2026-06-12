import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import React from "react";

import {
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
import { standaloneInsightActionCardsDict } from "@/utils/i18n/pages/private/dashboard/openMonth/StandaloneInsightActionCards.i18n";
import { tDict } from "@/utils/i18n/translate";

/**
 * StandaloneInsightActionCards (V2 PR4)
 *
 * Replaces the AttentionLane's explanatory section ("Worth a quick look" /
 * eyebrow / hint / "How these are chosen" disclosure) with the standalone
 * blueprint's compact card row: at most three bordered cards, each an icon,
 * a one-line title, a short factual body, and one action.
 *
 * Ranking is unchanged — `rankAttentionItems` derives everything on-device
 * from the existing dashboard summary and close-availability resolver. Card
 * copy stays factual about planned numbers and never presents itself as
 * backend-owned advice. Actions map only to existing supported handlers:
 * close-month flow, current-month quick drawers, full editor routes, and the
 * breakdown page — never a future or planned month.
 *
 * Closed/skipped months never reach this component (the dashboard branches
 * above us); the ranking helper returns `[]` defensively regardless.
 */
export interface StandaloneInsightActionCardsProps {
  summary: DashboardSummary;
  closeAvailability: CloseAvailability;
  onCloseMonth: () => void;
  onOpenQuickDrawer: (pillar: AttentionPillar) => void;
  onOpenFullEditor: (pillar: AttentionPillar) => void;
  className?: string;
}

type DictKey = keyof typeof standaloneInsightActionCardsDict.sv;

/** Blueprint tone circles: deficit/overdue danger, close-ready amber,
 * positive emerald, informational shell-neutral. */
const SEVERITY_ICON_WRAP: Record<AttentionSeverity, string> = {
  critical: "bg-eb-danger/10 text-eb-danger",
  attention: "bg-eb-warning/15 text-amber-800",
  info: "bg-[rgb(var(--eb-shell)/0.35)] text-eb-text/60",
  positive: "bg-eb-accentSoft text-emerald-800",
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

function resolveBody(item: AttentionItem, t: (key: DictKey) => string): string {
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

/** Compact inline action (blueprint card action link): accent text + arrow. */
const actionLinkClass = cn(
  "group/cta mt-auto inline-flex w-fit items-center gap-1 pt-2",
  "text-xs font-bold text-eb-accent transition hover:text-emerald-700",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50 focus-visible:rounded",
);

function CardAction({
  item,
  label,
  onCloseMonth,
  onOpenQuickDrawer,
  onOpenFullEditor,
}: {
  item: AttentionItem;
  label: string;
  onCloseMonth: () => void;
  onOpenQuickDrawer: (pillar: AttentionPillar) => void;
  onOpenFullEditor: (pillar: AttentionPillar) => void;
}) {
  const action: AttentionActionTarget = item.action;

  if (action.kind === "open-breakdown") {
    return (
      <Link
        to={appRoutes.dashboardBreakdown}
        className={actionLinkClass}
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
      className={actionLinkClass}
      data-testid={`attention-action-${item.id}`}
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 transition group-hover/cta:translate-x-0.5" />
    </button>
  );
}

const StandaloneInsightActionCards: React.FC<
  StandaloneInsightActionCardsProps
> = ({
  summary,
  closeAvailability,
  onCloseMonth,
  onOpenQuickDrawer,
  onOpenFullEditor,
  className,
}) => {
  const locale = useAppLocale();
  const t = <K extends DictKey>(key: K): string =>
    tDict(key, locale, standaloneInsightActionCardsDict);

  const items = React.useMemo(
    () =>
      rankAttentionItems({
        summary,
        closeAvailability,
      }),
    [summary, closeAvailability],
  );

  if (items.length === 0) return null;

  return (
    <section
      data-testid="insight-action-cards"
      aria-label={t("sectionAriaLabel")}
      className={className}
    >
      <ul
        className="grid gap-2.5 md:grid-cols-3"
        data-testid="insight-action-cards-items"
        data-count={items.length}
      >
        {items.map((item) => (
          <li
            key={item.id}
            data-testid={`attention-item-${item.id}`}
            data-severity={item.severity}
            className="flex gap-2.5 rounded-2xl border border-eb-stroke/45 bg-eb-surface/70 px-[13px] py-3"
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full",
                SEVERITY_ICON_WRAP[item.severity],
              )}
              aria-hidden="true"
            >
              {severityIcon(item)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[13px] font-bold leading-tight text-eb-text">
                {t(item.titleKey as DictKey)}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-eb-text/60">
                {resolveBody(item, t)}
              </p>
              <CardAction
                item={item}
                label={t(item.actionKey as DictKey)}
                onCloseMonth={onCloseMonth}
                onOpenQuickDrawer={onOpenQuickDrawer}
                onOpenFullEditor={onOpenFullEditor}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StandaloneInsightActionCards;
