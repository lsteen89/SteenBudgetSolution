import { ArrowRight, SlidersHorizontal } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

import {
  dashboardGhostActionClass,
  dashboardQuietActionClass,
} from "./DashboardPrimitives";
import { dashboardSurfaceNeutral } from "./dashboardSurface";

/**
 * Shared shell for an open-month pillar workbench card.
 *
 * Each card has three reading zones:
 *
 *  1. Header — small icon chip, pillar title, large planned amount,
 *     short subtitle.
 *  2. Signals — the dense planned-budget signal stack rendered by the
 *     parent section as `children` (top categories, subscription
 *     pressure, goal progress, etc.). Always reflects planned budget,
 *     never observed spend.
 *  3. Footer — one primary "Quick adjust" action + one "Edit all" link.
 *     `editLabel` is optional so a future read-only variant can render
 *     just a view-only deeper-link.
 *
 * The shell stays presentational. Per-pillar copy and signal layout live
 * in the workbench section so this component does not need to know
 * which pillar it is rendering.
 */
export interface PillarWorkbenchCardProps {
  title: string;
  amount: string;
  amountAriaLabel?: string;
  subtitle: string;
  icon: React.ReactNode;
  /** Dense planned-budget signal rows for this pillar. */
  children: React.ReactNode;
  /** Primary quick-adjust action. Lazy drawer in the parent. */
  quickAdjustLabel: string;
  onQuickAdjust: () => void;
  /** Optional secondary editor link. Omitted = no secondary action. */
  editLabel?: string;
  onEdit?: () => void;
  /** Testid hook for dashboard tests. */
  testId?: string;
}

const PillarWorkbenchCard: React.FC<PillarWorkbenchCardProps> = ({
  title,
  amount,
  amountAriaLabel,
  subtitle,
  icon,
  children,
  quickAdjustLabel,
  onQuickAdjust,
  editLabel,
  onEdit,
  testId,
}) => {
  return (
    <article
      data-testid={testId}
      className={cn(dashboardSurfaceNeutral, "flex h-full flex-col")}
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-[rgb(var(--eb-shell)/0.4)] text-eb-text/70">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-sm font-extrabold text-eb-text">{title}</h3>
          <p className="mt-0.5 text-[11.5px] leading-4 text-eb-text/50">
            {subtitle}
          </p>
        </div>
        <p
          className="shrink-0 text-lg font-extrabold tabular-nums text-eb-text"
          aria-label={
            amountAriaLabel ? `${amountAriaLabel}: ${amount}` : undefined
          }
        >
          {amount}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-3.5 sm:px-5">
        {children}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-eb-stroke/35 bg-[rgb(var(--eb-shell)/0.12)] px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onQuickAdjust}
          className={cn(dashboardQuietActionClass, "flex-1")}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span>{quickAdjustLabel}</span>
        </button>
        {editLabel && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className={cn(dashboardGhostActionClass, "group h-[34px] px-2")}
          >
            <span>{editLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </button>
        ) : null}
      </footer>
    </article>
  );
};

export default PillarWorkbenchCard;
