// Handoff · V2 — full takeover · chapter stamp + year strip.
//
// Biggest dopamine dial: a one-shot interstitial that takes the dashboard
// over briefly after closing. The month gets a "Closed · saved" stamp that
// settles into place (slight tilt — feels physical), the year-strip shows
// the just-closed dot landing in green, and the final balance sits above a
// soft summary. Two CTAs: "Fortsätt till maj" (primary) and "Granska april"
// (secondary). One-shot confetti shimmer.

function HandoffTakeover() {
  const surplus = 1240.5;
  const animatedSurplus = useCountUp(surplus, 1100);
  const animatedIncome = useCountUp(70020, 1200);
  const animatedExpense = useCountUp(59535, 1200);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(120% 80% at 50% -10%, rgb(220,252,231) 0%, rgb(239,246,255) 35%, rgb(219,234,254) 100%)",
      }}
    >
      {/* Decorative blobs */}
      <CmDecorBlobs />

      {/* Confetti — over the whole takeover, not just the card */}
      <div style={{ position: "absolute", left: "50%", top: 110, width: 1, height: 1 }}>
        <CmConfetti pieces={48} spreadX={620} spreadY={520} />
      </div>

      <div
        className="cm-fade-up"
        style={{
          position: "relative",
          maxWidth: 1040,
          margin: "0 auto",
          padding: "48px 56px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        <CmKicker tone="accent">Månaden är stängd</CmKicker>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: "rgb(var(--eb-text))",
              lineHeight: 1.05,
            }}
          >
            april 2026 är sparad
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 560,
              fontSize: 15,
              lineHeight: 1.65,
              color: "rgb(var(--eb-text) / 0.65)",
            }}
          >
            En historisk sammanfattning är skapad. Maj 2026 ligger redan öppen — och har fått {cmFmtSek(surplus)} med sig på vägen.
          </p>
        </div>

        {/* Stamp + mascot */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 28, marginTop: 8 }}>
          <img
            src={cmMascot("RichBird")}
            alt=""
            aria-hidden="true"
            className="cm-mascot-hello cm-float"
            style={{
              width: 132,
              height: 132,
              objectFit: "contain",
              filter: "drop-shadow(0 18px 30px rgba(21,39,81,0.18))",
            }}
          />
          <Stamp month="april" year="2026" />
        </div>

        {/* Year strip in a soft card */}
        <div
          style={{
            marginTop: 4,
            width: "100%",
            maxWidth: 720,
            padding: "20px 28px 18px",
            background: "rgb(var(--eb-surface) / 0.82)",
            border: "1px solid rgb(var(--eb-stroke) / 0.4)",
            borderRadius: 24,
            boxShadow: "0 18px 50px rgba(21,39,81,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <CmKicker>Året 2026</CmKicker>
            <span style={{ fontSize: 12, color: "rgb(var(--eb-text) / 0.6)", fontWeight: 500 }}>
              <b style={{ color: "rgb(var(--eb-accent))", fontWeight: 800 }}>4</b>
              <span style={{ color: "rgb(var(--eb-text) / 0.5)" }}> / 12 månader stängda</span>
            </span>
          </div>
          <CmYearStrip closedThrough={3} highlightLast size="md" />
        </div>

        {/* Numbers strip */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <NumberPanel
            label="Inkomster i april"
            value={cmFmtSek(animatedIncome, { fractionDigits: 0 })}
          />
          <NumberPanel
            label="Utgifter i april"
            value={`\u2212${cmFmtSek(animatedExpense, { fractionDigits: 0 })}`}
          />
          <NumberPanel
            label="Fördes över till maj"
            value={`+${cmFmtSek(animatedSurplus)}`}
            accent
          />
        </div>

        {/* CTA — one calm next step, per the i18n directive */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 6 }}>
          <CmCta variant="primary" style={{ height: 52, padding: "0 28px", fontSize: 16 }}>
            Fortsätt till maj 2026
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </CmCta>
          {/* Dismiss — the takeover is full-screen, so we need an explicit "stay here" path.
              Worded as lingering, not navigation: april is already what's underneath. */}
          <button
            type="button"
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              fontSize: 13,
              color: "rgb(var(--eb-text) / 0.55)",
              textDecoration: "underline",
              textDecorationColor: "rgb(var(--eb-text) / 0.25)",
              textUnderlineOffset: 4,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Stanna i april en stund
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "rgb(var(--eb-text) / 0.45)" }}>
          Historiken är skrivskyddad — du kan alltid komma tillbaka och läsa april.
        </p>
      </div>

      {/* Top-right dismiss · pure dismiss, the takeover overlays april */}
      <button
        type="button"
        aria-label="Stäng"
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          width: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          border: "1px solid rgb(var(--eb-stroke) / 0.4)",
          background: "rgb(var(--eb-surface) / 0.75)",
          color: "rgb(var(--eb-text) / 0.6)",
          cursor: "pointer",
          fontFamily: "inherit",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function Stamp({ month, year }) {
  return (
    <div
      className="cm-stamp"
      style={{
        position: "relative",
        padding: "18px 28px 20px",
        borderRadius: 16,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(220,252,231,0.65))",
        border: "2px solid rgb(var(--eb-accent) / 0.55)",
        boxShadow:
          "0 18px 40px rgba(34,197,94,0.18), inset 0 1px 0 rgba(255,255,255,0.85)",
        transform: "rotate(-7deg)",
        minWidth: 220,
        textAlign: "center",
        // sub-pixel grain via repeating gradient to read like a real stamp
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(220,252,231,0.65)), repeating-linear-gradient(45deg, rgba(34,197,94,0.04) 0 2px, transparent 2px 6px)",
        backgroundBlendMode: "normal, multiply",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "rgb(var(--eb-accent))",
          marginBottom: 4,
        }}
      >
        Stängd · sparad
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "rgb(var(--eb-text))",
          lineHeight: 1.1,
        }}
      >
        {month}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "rgb(var(--eb-text) / 0.55)",
        }}
      >
        {year}
      </div>

      {/* corner dots that read as 'punched paper' */}
      <span style={cornerDotStyle("tl")} />
      <span style={cornerDotStyle("tr")} />
      <span style={cornerDotStyle("bl")} />
      <span style={cornerDotStyle("br")} />
    </div>
  );
}

function cornerDotStyle(corner) {
  const base = {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 9999,
    background: "rgb(var(--eb-accent) / 0.4)",
  };
  const off = 8;
  if (corner === "tl") return { ...base, top: off, left: off };
  if (corner === "tr") return { ...base, top: off, right: off };
  if (corner === "bl") return { ...base, bottom: off, left: off };
  return { ...base, bottom: off, right: off };
}

function NumberPanel({ label, value, accent }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 18,
        background: "rgb(var(--eb-surface) / 0.85)",
        border: "1px solid rgb(var(--eb-stroke) / 0.4)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
        backdropFilter: "blur(8px)",
        textAlign: "left",
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <CmKicker>{label}</CmKicker>
      </div>
      <div
        className="tabular"
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.015em",
          color: accent ? "rgb(var(--eb-accent))" : "rgb(var(--eb-text))",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

window.HandoffTakeover = HandoffTakeover;
