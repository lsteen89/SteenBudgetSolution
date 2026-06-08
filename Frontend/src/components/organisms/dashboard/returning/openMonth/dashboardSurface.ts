import { cn } from "@/lib/utils";

/**
 * DP4 — one glass surface language for the open-month dashboard cards.
 *
 * Every card on the open-month dashboard (MoneyState, AttentionLane, the
 * pillar cards, and the tone-tinted CloseBand) shares one surface recipe so
 * the page reads as a single coherent stack rather than four slightly
 * different panels. Before DP4 the cards drifted on radius (32 / 24 / 16px),
 * border opacity (/25, /30 vs /40), background opacity, and none carried the
 * subtle glass sheen the design's `Surface` uses — so they looked flat next
 * to each other.
 *
 * These constants mirror the *token values* of the shared `SurfaceCard`
 * primitive (rounded-3xl, shadow-eb, translucent eb-surface fill that drops
 * to /70 under backdrop-filter, border-eb-stroke/40, a quiet top-down sheen).
 * They are intentionally applied to each card's own semantic root
 * (`<section>` / `<article>` with `aria-*`) rather than wrapping the cards in
 * `SurfaceCard`, because `SurfaceCard` is a fixed-tone `<div>` whose inner
 * relative wrapper cannot express:
 *   - the section/article landmark + aria-labelledby these cards rely on,
 *   - CloseBand's eligible/overdue tone-tinted border and background,
 *   - MoneyState's negative-tone (deficit) border.
 *
 * No new colour, shadow, or blur tokens are introduced — only existing
 * `eb-*` tokens and the existing `shadow-eb` utility.
 */

/**
 * Structural surface shared by *every* dashboard card, neutral or tinted.
 * Carries the radius, elevation, clip, and glass blur — but no fill or border,
 * so tone-tinted cards (CloseBand) can supply their own.
 */
export const dashboardSurfaceBase =
  "relative overflow-hidden rounded-3xl shadow-eb supports-[backdrop-filter]:backdrop-blur-md";

/**
 * Neutral glass surface: the structural base plus a stroke border, a
 * translucent eb-surface fill, and a quiet top-down sheen so the card reads
 * as layered glass instead of a flat panel. Used by MoneyState, AttentionLane,
 * and the pillar cards.
 *
 * Compose per-card extras (padding, deficit border) after this with `cn(...)`;
 * `cn` is twMerge-backed, so a later `border-eb-danger/40` cleanly overrides
 * the neutral `border-eb-stroke/40`.
 */
export const dashboardSurfaceNeutral = cn(
  dashboardSurfaceBase,
  "border border-eb-stroke/40 bg-eb-surface/85",
  "bg-[linear-gradient(180deg,rgb(var(--eb-shell)/0.18),transparent_46%)]",
  "supports-[backdrop-filter]:bg-eb-surface/70",
);
