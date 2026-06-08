import { ArrowRight } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

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
      className="flex h-full flex-col rounded-2xl border border-eb-stroke/25 bg-eb-surface/80 px-4 py-4 shadow-eb transition-colors duration-150 hover:bg-eb-surface sm:px-5"
    >
      <header className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] text-eb-accent">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-eb-text/55">
            {title}
          </h3>
          <p
            className="mt-0.5 text-2xl font-extrabold text-eb-text tabular-nums"
            aria-label={
              amountAriaLabel ? `${amountAriaLabel}: ${amount}` : undefined
            }
          >
            {amount}
          </p>
          <p className="mt-1 text-xs leading-5 text-eb-text/65">{subtitle}</p>
        </div>
      </header>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-eb-stroke/15 pt-3">
        {children}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onQuickAdjust}
          className={cn(
            "group inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/40 bg-eb-surface px-3 text-sm font-semibold text-eb-text",
            "shadow-[0_8px_18px_rgba(21,39,81,0.08)] transition-[transform,background-color,border-color,box-shadow] duration-150",
            "hover:-translate-y-[1px] hover:border-eb-stroke/60 hover:bg-eb-surface/80 hover:shadow-[0_12px_24px_rgba(21,39,81,0.10)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 active:translate-y-0 motion-reduce:transform-none",
          )}
        >
          <span>{quickAdjustLabel}</span>
        </button>
        {editLabel && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "group inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-eb-accent/25 bg-[rgb(var(--eb-accent)/0.08)] px-3 text-sm font-semibold text-eb-accent",
              "shadow-[0_8px_18px_rgba(21,39,81,0.06)] transition-[transform,background-color,border-color,box-shadow] duration-150",
              "hover:-translate-y-[1px] hover:border-eb-accent/35 hover:bg-[rgb(var(--eb-accent)/0.12)] hover:shadow-[0_12px_24px_rgba(21,39,81,0.08)]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20 active:translate-y-0 motion-reduce:transform-none",
            )}
          >
            <span>{editLabel}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </button>
        ) : null}
      </footer>
    </article>
  );
};

export default PillarWorkbenchCard;
