// Shared helpers for the close-month explorations.
//
// Exposed on window so other Babel scripts can use them (Babel scope is
// per-script). All visual tokens come from colors_and_type.css, never invented.

const cmFmtSek = (n, opts = {}) => {
  const fractionDigits = opts.fractionDigits ?? 2;
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
};

const cmFmtSekSigned = (n, opts = {}) => {
  const formatted = cmFmtSek(Math.abs(n), opts);
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `\u2212${formatted}`;
  return formatted;
};

// Count-up hook — animates from 0 to target on mount.
function useCountUp(target, durationMs = 900) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// Soft confetti burst — low density, brand palette, one-shot.
//
// Reads like a quiet shimmer rather than a party popper: small pieces, slow
// fall, mostly green/blue/lime, randomised lateral drift. Pure CSS animation
// after initial JS placement so it survives reduced-motion gracefully.
function CmConfetti({ pieces = 28, spreadX = 360, spreadY = 320 }) {
  const items = React.useMemo(() => {
    // Deterministic-ish based on render, but okay-random is fine here.
    const palette = [
      "rgb(34,197,94)",     // eb-accent
      "rgb(152,255,152)",   // eb-money lime
      "rgb(77,185,254)",    // eb-shell-2
      "rgb(220,252,231)",   // eb-accent-soft
      "rgb(21,39,81)",      // eb-text (a few darker chips for contrast)
    ];
    return Array.from({ length: pieces }, (_, i) => {
      const angle = (Math.random() - 0.5) * Math.PI; // -90deg..90deg
      const dx = Math.cos(angle) * spreadX * (0.5 + Math.random() * 0.5);
      const dy = spreadY * (0.7 + Math.random() * 0.6);
      const rot = (Math.random() - 0.5) * 1080;
      const dur = 1500 + Math.random() * 900;
      const delay = Math.random() * 220;
      const w = 6 + Math.random() * 6;
      const h = 8 + Math.random() * 8;
      const color = palette[i % palette.length];
      const rounded = Math.random() < 0.35;
      return { dx, dy, rot, dur, delay, w, h, color, rounded, key: i };
    });
  }, [pieces, spreadX, spreadY]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {items.map((p) => (
        <span
          key={p.key}
          className="cm-confetti-piece"
          style={{
            "--cm-dx": `${p.dx}px`,
            "--cm-dy": `${p.dy}px`,
            "--cm-rot": `${p.rot}deg`,
            "--cm-dur": `${p.dur}ms`,
            "--cm-delay": `${p.delay}ms`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.rounded ? 9999 : 2,
          }}
        />
      ))}
    </div>
  );
}

// Twelve-month strip — used by review-hero and handoff-takeover.
// "closedThrough" is index of the just-closed month (0-based). Months <= that
// index render filled; the just-closed one optionally pulses.
function CmYearStrip({
  months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"],
  closedThrough = 3,
  highlightLast = true,
  size = "md",
}) {
  const dot = size === "lg" ? 14 : size === "sm" ? 8 : 10;
  const gap = size === "lg" ? 14 : 10;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`,
        gap,
        alignItems: "center",
      }}
    >
      {months.map((m, i) => {
        const closed = i <= closedThrough;
        const isLast = i === closedThrough;
        return (
          <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: dot,
                height: dot,
                borderRadius: 9999,
                background: closed ? "rgb(var(--eb-accent))" : "rgb(var(--eb-shell) / 0.55)",
                border: closed ? "0" : "1px solid rgb(var(--eb-stroke) / 0.65)",
                boxShadow:
                  isLast && highlightLast
                    ? "0 0 0 6px rgb(var(--eb-accent) / 0.18)"
                    : "none",
                transition: "box-shadow 200ms ease-out",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: closed ? 600 : 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: closed
                  ? "rgb(var(--eb-text) / 0.85)"
                  : "rgb(var(--eb-text) / 0.45)",
              }}
            >
              {m}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Mascot URL helper (relative to the html file).
const cmMascot = (name) => `../../assets/mascots/${name}.png`;

// Common chrome — a light "page" wrap so the artboards look like the dashboard.
function CmPageWrap({ children, height = "100%", padded = true, gradient = "default" }) {
  const bg =
    gradient === "lift"
      ? "linear-gradient(to bottom, rgb(var(--eb-shell) / 0.35), rgb(var(--eb-bg-from)) 40%, rgb(var(--eb-bg-to)))"
      : "linear-gradient(to bottom right, rgb(var(--eb-bg-from)), rgb(var(--eb-bg-to)))";
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        background: bg,
        padding: padded ? "32px 40px" : 0,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// Three blurred radial blobs at the top — the brand's decor pattern.
function CmDecorBlobs() {
  const blob = {
    position: "absolute",
    borderRadius: 9999,
    filter: "blur(40px)",
  };
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: "0 0 auto 0", height: 240, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ ...blob, top: -96, left: "50%", transform: "translateX(-50%)", width: 288, height: 288, background: "rgb(var(--eb-shell) / 0.45)" }} />
      <div style={{ ...blob, top: -96, left: "10%", width: 224, height: 224, background: "rgb(var(--eb-shell) / 0.30)" }} />
      <div style={{ ...blob, top: -96, right: "10%", width: 256, height: 256, background: "rgb(var(--eb-shell) / 0.30)" }} />
    </div>
  );
}

// Tiny kicker — uppercase eyebrow, brand-standard.
function CmKicker({ children, tone = "muted" }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color:
          tone === "accent"
            ? "rgb(var(--eb-accent))"
            : tone === "strong"
              ? "rgb(var(--eb-text) / 0.65)"
              : "rgb(var(--eb-text) / 0.45)",
      }}
    >
      {children}
    </span>
  );
}

// Primary CTA — matches .eb-cta but inline so we don't pollute global CSS.
function CmCta({ children, variant = "primary", onClick, style }) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const base = {
    height: 44,
    padding: "0 22px",
    borderRadius: 16,
    fontWeight: 600,
    fontSize: 15,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: 0,
    cursor: "pointer",
    transition: "transform 150ms, filter 150ms, box-shadow 150ms",
    fontFamily: "inherit",
  };
  if (isPrimary)
    Object.assign(base, {
      background: "rgb(var(--eb-accent))",
      color: "#fff",
      boxShadow: "0 14px 28px rgb(var(--eb-accent) / 0.22)",
    });
  if (isSecondary)
    Object.assign(base, {
      background: "rgb(var(--eb-surface) / 0.75)",
      color: "rgb(var(--eb-text) / 0.85)",
      border: "1px solid rgb(var(--eb-stroke) / 0.4)",
      boxShadow: "0 10px 22px rgb(15 23 42 / 0.06)",
    });
  if (variant === "ghost")
    Object.assign(base, {
      background: "transparent",
      color: "rgb(var(--eb-text) / 0.78)",
      boxShadow: "none",
    });
  return (
    <button type="button" onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  );
}

Object.assign(window, {
  cmFmtSek,
  cmFmtSekSigned,
  useCountUp,
  CmConfetti,
  CmYearStrip,
  cmMascot,
  CmPageWrap,
  CmDecorBlobs,
  CmKicker,
  CmCta,
});
