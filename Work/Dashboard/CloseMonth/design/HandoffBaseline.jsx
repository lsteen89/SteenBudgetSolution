// Faithful rebuild of ClosedMonthHandoffCard.tsx — the calm strip that lives
// on the dashboard the moment after a month is closed. Rebuilt to scale, so
// the redesigned variants can be compared at the same artboard width.

function HandoffBaseline() {
  // Tiny dashboard chrome so the card sits in context.
  return (
    <CmPageWrap height="100%" padded>
      <CmDecorBlobs />
      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto" }}>
        {/* Mini header crumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <CmKicker>Dashboard · maj 2026</CmKicker>
          <span style={{ width: 4, height: 4, borderRadius: 9999, background: "rgb(var(--eb-text) / 0.25)" }} />
          <span style={{ fontSize: 12, color: "rgb(var(--eb-text) / 0.55)" }}>
            april 2026 · stängd
          </span>
        </div>

        {/* The handoff card — exact reconstruction */}
        <aside
          data-variant="positiveFull"
          role="status"
          aria-live="polite"
          style={{
            position: "relative",
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            padding: "16px 24px 18px",
            borderRadius: 16,
            background: "rgb(34 197 94 / 0.06)",
            border: "1px solid rgb(34 197 94 / 0.15)",
            boxShadow: "0 10px 30px rgba(21,39,81,0.06)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              flex: "0 0 auto",
              borderRadius: 9999,
              background: "rgb(34 197 94 / 0.15)",
              color: "rgb(22 163 74)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 11 15 16 9" />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "rgb(var(--eb-text))",
              }}
            >
              april 2026 är stängd
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgb(var(--eb-text) / 0.72)",
                maxWidth: 640,
              }}
            >
              Bra jobbat — april 2026 är sparad som en historisk sammanfattning. {cmFmtSek(1240.5)} har förts över till maj 2026.
            </p>
            <div style={{ marginTop: 8 }}>
              <CmCta variant="primary">Fortsätt till maj 2026</CmCta>
            </div>
          </div>

          <button
            type="button"
            aria-label="Stäng meddelandet"
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
              color: "rgb(var(--eb-text) / 0.55)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </aside>

        {/* placeholder content underneath, just to suggest the dashboard continues */}
        <div
          style={{
            marginTop: 28,
            background: "rgb(var(--eb-surface) / 0.85)",
            border: "1px solid rgb(var(--eb-stroke) / 0.4)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "var(--eb-shadow-eb)",
            height: 160,
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

window.HandoffBaseline = HandoffBaseline;
