// Handoff · V1 — inline card · mascot + soft confetti + count-up.
//
// Lives in the same spot as the baseline card on the dashboard, but the
// dopamine is dialled up to ~5/10: the mascot does the celebrating, a count-up
// settles the final balance, a one-shot confetti shimmer fires on mount, and
// a small "4 of 12 months closed this year" chip rewards the habit, not the
// numbers. Copy is unchanged from the i18n dictionary.

function HandoffConfetti() {
  const surplus = 1240.5;
  const animated = useCountUp(surplus, 1100);

  // Re-run confetti when user clicks the card (for demo) — production would
  // play it once per close, then never again.
  const [confettiKey, setConfettiKey] = React.useState(0);

  return (
    <CmPageWrap height="100%" padded>
      <CmDecorBlobs />
      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <CmKicker>Dashboard · maj 2026</CmKicker>
          <span style={{ width: 4, height: 4, borderRadius: 9999, background: "rgb(var(--eb-text) / 0.25)" }} />
          <span style={{ fontSize: 12, color: "rgb(var(--eb-text) / 0.55)" }}>april 2026 · stängd</span>
        </div>

        <aside
          onClick={() => setConfettiKey((k) => k + 1)}
          className="cm-fade-up"
          role="status"
          aria-live="polite"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 28,
            alignItems: "center",
            padding: "22px 28px 22px 24px",
            borderRadius: 28,
            background:
              "linear-gradient(135deg, rgb(220,252,231,0.85) 0%, rgb(255,255,255,0.92) 38%, rgb(224,240,255,0.6) 100%)",
            border: "1px solid rgb(34 197 94 / 0.25)",
            boxShadow:
              "0 24px 60px rgba(21,39,81,0.10), 0 4px 14px rgba(34,197,94,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {/* Confetti layer */}
          <div
            key={confettiKey}
            style={{
              position: "absolute",
              left: 110,
              right: 0,
              top: 0,
              bottom: 0,
              pointerEvents: "none",
            }}
          >
            <CmConfetti pieces={26} spreadX={420} spreadY={280} />
          </div>

          {/* Mascot */}
          <div
            style={{
              position: "relative",
              width: 132,
              height: 132,
              flex: "0 0 auto",
            }}
          >
            <div
              aria-hidden="true"
              className="cm-halo"
              style={{
                position: "absolute",
                inset: -8,
                background:
                  "radial-gradient(closest-side, rgb(var(--eb-accent) / 0.30), rgb(var(--eb-accent) / 0) 70%)",
                filter: "blur(4px)",
              }}
            />
            <img
              src={cmMascot("SuccessEmailBird")}
              alt=""
              className="cm-mascot-hello"
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 12px 22px rgba(21,39,81,0.18))",
              }}
            />
          </div>

          {/* Copy + CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, position: "relative" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <CmKicker tone="accent">Månaden är stängd</CmKicker>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 9999,
                  background: "rgb(var(--eb-surface) / 0.85)",
                  border: "1px solid rgb(var(--eb-stroke) / 0.4)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgb(var(--eb-text) / 0.72)",
                  letterSpacing: "0.04em",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="8 12 11 15 16 9" />
                </svg>
                4 av 12 månader stängda i år
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "rgb(var(--eb-text))",
                lineHeight: 1.1,
              }}
            >
              april 2026 är stängd
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgb(var(--eb-text) / 0.7)",
                maxWidth: 560,
              }}
            >
              Bra jobbat — april är sparad som en historisk sammanfattning. Överskottet har följt med till maj.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <CmCta variant="primary">
                Fortsätt till maj 2026
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13 6 19 12 13 18" />
                </svg>
              </CmCta>
              <CmCta variant="ghost">Granska april</CmCta>
            </div>
          </div>

          {/* Right: overskott number */}
          <div
            style={{
              position: "relative",
              minWidth: 220,
              padding: "14px 18px",
              borderRadius: 20,
              background: "rgb(var(--eb-surface) / 0.85)",
              border: "1px solid rgb(var(--eb-stroke) / 0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
              backdropFilter: "blur(8px)",
              textAlign: "right",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <CmKicker>Fördes över till maj</CmKicker>
            </div>
            <div
              className="tabular"
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "rgb(var(--eb-accent))",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              +{cmFmtSek(animated)}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgb(var(--eb-stroke) / 0.35)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "rgb(var(--eb-text) / 0.65)" }}>
                <span>Slutsaldo april</span>
                <span className="tabular" style={{ fontWeight: 600, color: "rgb(var(--eb-text) / 0.85)" }}>{cmFmtSek(1240.5)}</span>
              </div>
            </div>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            aria-label="Stäng meddelandet"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              border: 0,
              background: "transparent",
              color: "rgb(var(--eb-text) / 0.45)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </aside>

        {/* Tiny hint that the card is interactive — re-trigger confetti on click */}
        <p style={{ margin: "10px 4px 0", fontSize: 11, color: "rgb(var(--eb-text) / 0.45)" }}>
          Tip: click the card to replay the confetti (demo only — production fires it once).
        </p>

        {/* dashboard placeholder */}
        <div
          style={{
            marginTop: 24,
            background: "rgb(var(--eb-surface) / 0.85)",
            border: "1px solid rgb(var(--eb-stroke) / 0.4)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "var(--eb-shadow-eb)",
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgb(var(--eb-text) / 0.3)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            letterSpacing: "0.12em",
          }}
        >
          dashboard content · maj 2026
        </div>
      </div>
    </CmPageWrap>
  );
}

window.HandoffConfetti = HandoffConfetti;
