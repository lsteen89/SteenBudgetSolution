import React from "react";

import { cn } from "@/lib/utils";

/**
 * Dashboard-local visual vocabulary for the open-month dashboard (V2 PR1).
 *
 * The standalone blueprint composes the whole page from a small set of
 * primitives — large glass surfaces, compact model cards, small status pills,
 * and quiet/ghost actions. These live here (next to `dashboardSurface.ts`,
 * which owns the large-surface recipe) so the later V2 slices consume one
 * vocabulary instead of copying one-off class strings per component.
 *
 * Everything is built from existing `eb-*` tokens, the `shadow-eb` utility,
 * and stock Tailwind tone classes already used on the dashboard
 * (amber/emerald) — no parallel palette.
 */

// ---------------------------------------------------------------- ModelCard

export interface ModelCardProps {
  /** Small uppercase eyebrow naming the card ("This month", "Next month"…). */
  kicker: string;
  /** Emphasised variant — accent border + solid surface (the blueprint's
   * "Next month" card). Neutral cards sit quieter on the page. */
  accent?: boolean;
  testId?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Compact planning-layer card (blueprint `ModelCard`): 18px radius, tight
 * 14/15px rhythm, neutral or accent treatment. Children flow under the
 * kicker; use `mt-auto` on a trailing action to pin it to the card foot.
 */
export function ModelCard({
  kicker,
  accent = false,
  testId,
  className,
  children,
}: ModelCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col rounded-[18px] px-[15px] py-3.5",
        accent
          ? "border-[1.5px] border-eb-accent/45 bg-eb-surface/95 shadow-eb"
          : "border border-eb-stroke/45 bg-eb-surface/60",
        className,
      )}
    >
      <span
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[0.16em]",
          accent ? "text-eb-accent" : "text-eb-text/45",
        )}
      >
        {kicker}
      </span>
      {children}
    </div>
  );
}

// ------------------------------------------------------------ DashboardPill

export type DashboardPillTone =
  | "neutral"
  | "accent"
  | "warn"
  | "danger"
  | "surface";

const PILL_TONE_CLASSES: Record<DashboardPillTone, string> = {
  neutral: "border-eb-stroke/35 bg-[rgb(var(--eb-shell)/0.4)] text-eb-text/75",
  accent: "border-eb-accent/30 bg-eb-accentSoft text-emerald-800",
  warn: "border-eb-warning/40 bg-eb-warning/15 text-amber-800",
  danger: "border-eb-danger/25 bg-eb-danger/10 text-eb-danger",
  surface: "border-eb-stroke/50 bg-eb-surface/80 text-eb-text/70",
};

export interface DashboardPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: DashboardPillTone;
  /** `sm` (24px) for inline status next to a title, `md` (30px) default. */
  size?: "sm" | "md";
  /** Optional leading icon, sized by the caller (3/3.5 units fit). */
  icon?: React.ReactNode;
}

/**
 * Compact status pill for the dashboard (blueprint `Pill`). Smaller than the
 * shared `Pill` atom (36px) on purpose — dashboard pills annotate titles and
 * rows, they are not standalone chips.
 */
export function DashboardPill({
  tone = "neutral",
  size = "md",
  icon,
  className,
  children,
  ...props
}: DashboardPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-bold",
        size === "sm"
          ? "h-6 gap-1 px-2 text-[11px]"
          : "h-[30px] gap-1.5 px-2.5 text-[12.5px]",
        PILL_TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

// ----------------------------------------------------- small action recipes

/**
 * Small ghost action (blueprint `Btn variant="ghost"`): a quiet inline
 * text+arrow affordance for secondary navigation ("Breakdown →",
 * "Open full preview →"). Class string rather than a component so it
 * composes onto both `<button>` and router `<Link>`.
 */
export const dashboardGhostActionClass = cn(
  "inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-bold",
  "text-eb-text/60 transition hover:text-eb-text",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/40",
);

/**
 * Small quiet button (blueprint `Btn variant="quiet"`): a shell-tinted
 * secondary action that stays subordinate to the page's single primary CTA
 * ("Quick adjust" and friends).
 */
export const dashboardQuietActionClass = cn(
  "inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[14px] px-3",
  "border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.3)]",
  "text-[13px] font-semibold text-eb-text/80",
  "transition hover:bg-[rgb(var(--eb-shell)/0.45)] hover:text-eb-text",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/40",
);
