import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type SoftConfettiPalette = "brand" | "muted";

export type SoftConfettiProps = {
  /** Number of pieces. Brief defaults: ~48 for the dopamine path, ~12 for
   * the deficit path. */
  pieces?: number;
  /** Lateral spread in pixels, applied symmetrically around the origin. */
  spreadX?: number;
  /** Vertical spread in pixels — how far pieces fall. */
  spreadY?: number;
  /** "brand" uses the eBudget palette (accent + lime + shell-2 +
   * accent-soft + a darker chip). "muted" is reserved for the deficit
   * path — neutral chips only, no green or bright lime. */
  palette?: SoftConfettiPalette;
  /** Optional extra class on the absolute-positioned container. */
  className?: string;
};

const BRAND_PALETTE = [
  "rgb(var(--eb-accent))",
  "rgb(152,255,152)",
  "rgb(77,185,254)",
  "rgb(220,252,231)",
  "rgb(var(--eb-text))",
] as const;

const MUTED_PALETTE = [
  "rgb(var(--eb-stroke))",
  "rgb(var(--eb-shell))",
  "rgb(var(--eb-text) / 0.45)",
] as const;

type Piece = {
  key: number;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
  w: number;
  h: number;
  color: string;
  rounded: boolean;
};

/**
 * Low-density brand-palette confetti shimmer for the closed-month
 * handoff takeover.
 *
 * Reads as a quiet flourish, not a party popper: small pieces, slow
 * fall, restrained palette, randomised lateral drift. Position is
 * randomised once in JS, animation is pure CSS so a single mount runs
 * the burst to completion without any per-frame work. Honors
 * `prefers-reduced-motion` by rendering nothing at all.
 *
 * The parent should position the container (typically absolute, near
 * the headline). The component itself only handles its decorative
 * inner pieces.
 */
export default function SoftConfetti({
  pieces = 48,
  spreadX = 620,
  spreadY = 520,
  palette = "brand",
  className,
}: SoftConfettiProps) {
  const prefersReducedMotion = useReducedMotion();

  // Memoise the per-piece geometry so re-renders do not jitter the
  // burst. Re-rolls only if `pieces`/spread change.
  const items = useMemo<Piece[]>(() => {
    if (prefersReducedMotion) return [];
    const colors = palette === "brand" ? BRAND_PALETTE : MUTED_PALETTE;
    return Array.from({ length: pieces }, (_, i) => {
      const angle = (Math.random() - 0.5) * Math.PI;
      const dx = Math.cos(angle) * spreadX * (0.5 + Math.random() * 0.5);
      const dy = spreadY * (0.7 + Math.random() * 0.6);
      const rot = (Math.random() - 0.5) * 1080;
      const dur = 1500 + Math.random() * 900;
      const delay = Math.random() * 220;
      const w = 6 + Math.random() * 6;
      const h = 8 + Math.random() * 8;
      const color = colors[i % colors.length];
      const rounded = Math.random() < 0.35;
      return { key: i, dx, dy, rot, dur, delay, w, h, color, rounded };
    });
  }, [pieces, spreadX, spreadY, palette, prefersReducedMotion]);

  if (prefersReducedMotion || items.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden
      data-testid="soft-confetti"
      data-palette={palette}
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {items.map((p) => (
        <span
          key={p.key}
          className="cm-confetti-piece absolute left-1/2 top-0"
          style={
            {
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.rounded ? 9999 : 2,
              "--cm-dx": `${p.dx}px`,
              "--cm-dy": `${p.dy}px`,
              "--cm-rot": `${p.rot}deg`,
              "--cm-dur": `${p.dur}ms`,
              "--cm-delay": `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
