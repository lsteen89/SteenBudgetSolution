import React from "react";

import { cn } from "@/lib/utils";

/**
 * Dense proportional rows for the open-month Pillar Workbench (DP1).
 *
 * These replace the flat label+value `SignalRow`s with the designer mockup's
 * `MiniBar` / `GoalRow` / debt-row grammar: every figure sits on a small
 * proportional bar so a pillar reads as a real breakdown, not a text list.
 *
 * All three are purely presentational. They receive already-formatted money
 * strings and pre-computed percentages from the workbench — they never do
 * money math or own user-facing copy. Bars are decorative (the amount is
 * always present as text); only goal progress exposes a `progressbar` role,
 * because a percentage with no numeric label would otherwise be invisible to
 * assistive tech.
 *
 * Colours use the calm allocation palette (navy / blue / amber / green) via
 * `eb-*` tokens — never danger red for planned outflows. The caller picks the
 * bar colour per pillar through `barClassName`.
 */

/** Clamp any computed width to a safe 0–100 range (guards NaN / Infinity). */
function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

const BAR_TRACK = "h-1.5 w-full overflow-hidden rounded-full bg-eb-stroke/25";
const BAR_FILL =
  "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none";

/**
 * A labelled proportional row: label + planned amount on top, a decorative
 * proportional fill bar below. Used for income split and expense categories.
 */
export const MiniBar: React.FC<{
  label: string;
  value: string;
  /** Fill percentage relative to the pillar's largest row (0–100). */
  fillPct: number;
  /** Tailwind background class for the fill, e.g. `bg-eb-accent/70`. */
  barClassName: string;
  testId?: string;
}> = ({ label, value, fillPct, barClassName, testId }) => (
  <div data-testid={testId} className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate text-xs font-medium text-eb-text/75">
        {label}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-eb-text">
        {value}
      </span>
    </div>
    <div aria-hidden="true" className={BAR_TRACK}>
      <div
        className={cn(BAR_FILL, barClassName)}
        style={{ width: `${clampPct(fillPct)}%` }}
      />
    </div>
  </div>
);

/**
 * A savings-goal row: name (with a favorite dot), percent of target, a
 * progress bar, and a `saved of target · monthly/mo` sub-line.
 *
 * `pct === null` means the goal has no usable target — it renders the amounts
 * without a percentage and without a progress role (no divide-by-zero, no
 * misleading full bar).
 */
export const GoalRow: React.FC<{
  name: string;
  isFavorite?: boolean;
  /** Percent of target funded (0–100), or null when there is no target. */
  pct: number | null;
  /** Pre-composed `saved of target · monthly/mo` sub-line. */
  sub: string;
  /** Accessible label for the progress bar (only used when pct !== null). */
  progressAriaLabel?: string;
  testId?: string;
}> = ({ name, isFavorite, pct, sub, progressAriaLabel, testId }) => {
  const hasPct = pct !== null;
  const done = hasPct && pct >= 100;
  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-eb-text/80">
          {isFavorite ? (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-eb-accent"
            />
          ) : null}
          <span className="truncate">{name}</span>
        </span>
        {hasPct ? (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-eb-text/60">
            {pct}%
          </span>
        ) : null}
      </div>
      {/*
        Only a goal with a real target gets a track. A no-target goal is
        "amounts only" — a decorative empty track would imply progress that
        does not exist.
      */}
      {hasPct ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={progressAriaLabel}
          className={BAR_TRACK}
        >
          <div
            className={cn(BAR_FILL, done ? "bg-eb-accent" : "bg-eb-shell2")}
            style={{ width: `${clampPct(pct)}%` }}
          />
        </div>
      ) : null}
      <span className="text-[11px] tabular-nums text-eb-text/55">{sub}</span>
    </div>
  );
};

/**
 * A debt row: name + APR on top, a proportional balance bar (amber), and a
 * `balance · monthly/mo` sub-line.
 */
export const DebtRow: React.FC<{
  name: string;
  aprLabel: string;
  /** Fill percentage relative to the largest debt balance (0–100). */
  fillPct: number;
  /** Pre-composed `balance · monthly/mo` sub-line. */
  sub: string;
  testId?: string;
}> = ({ name, aprLabel, fillPct, sub, testId }) => (
  <div data-testid={testId} className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate text-xs font-medium text-eb-text/80">{name}</span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-eb-text/60">
        {aprLabel}
      </span>
    </div>
    <div aria-hidden="true" className={BAR_TRACK}>
      <div
        className={cn(BAR_FILL, "bg-eb-alert")}
        style={{ width: `${clampPct(fillPct)}%` }}
      />
    </div>
    <span className="text-[11px] tabular-nums text-eb-text/55">{sub}</span>
  </div>
);
