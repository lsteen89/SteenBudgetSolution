// Review modal · "Hero remaining" redesign.
//
// Brief: hit dopamine, but stay calm. Moves: lift "you have X kr left to
// handle" into a hero number with a quiet breathing halo, treat the surplus
// decision as a two-card tradeoff with bigger tap targets, and put a small
// year-chapter ribbon at the top so closing the month feels like progress.
// Mascot (CalcBird) peeks from the corner — friendly, not loud.

function ReviewHero() {
  const [mode, setMode] = React.useState("full");

  const income = 70020;
  const expenses = 59535;
  const savingsDebt = 8039.54 + 2535;
  const surplus = 1240.5; // hero number
  const targetSurplus = surplus;
  const animated = useCountUp(targetSurplus, 1100);

  return (
    <CmPageWrap height="100%" padded>
      <CmDecorBlobs />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgb(15 23 42 / 0.06)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        className="cm-fade-up"
        style={{
          position: "relative",
          width: 680,
          maxWidth: "100%",
          margin: "8px auto 0",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,255,0.96))",
          border: "1px solid rgb(var(--eb-stroke) / 0.25)",
          borderRadius: 28,
          boxShadow: "0 28px 80px rgba(21,39,81,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Top ribbon — year chapters */}
        <div
          style={{
            position: "relative",
            padding: "20px 32px 18px",
            background: "linear-gradient(180deg, rgb(var(--eb-shell) / 0.45), rgb(var(--eb-shell) / 0.10))",
            borderBottom: "1px solid rgb(var(--eb-stroke) / 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <CmKicker>Månadsstängning · kapitel 4 av 12</CmKicker>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: "rgb(var(--eb-text))",
                  lineHeight: 1.2,
                }}
              >
                Stäng april 2026
              </h2>
            </div>
            <div style={{ minWidth: 280, maxWidth: 320 }}>
              <CmYearStrip closedThrough={3} highlightLast size="sm" />
            </div>
          </div>
        </div>

        {/* Hero remaining */}
        <div
          style={{
            position: "relative",
            padding: "28px 32px 8px",
            textAlign: "center",
          }}
        >
          {/* Halo */}
          <div
            aria-hidden="true"
            className="cm-halo"
            style={{
              position: "absolute",
              left: "50%",
              top: 36,
              transform: "translateX(-50%)",
              width: 360,
              height: 180,
              background:
                "radial-gradient(closest-side, rgb(var(--eb-accent) / 0.22), rgb(var(--eb-accent) / 0) 70%)",
              filter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
          {/* Peeking mascot */}
          <img
            src={cmMascot("CalcBird")}
            alt=""
            aria-hidden="true"
            className="cm-float"
            style={{
              position: "absolute",
              right: 14,
              top: 18,
              width: 96,
              height: 96,
              objectFit: "contain",
              filter: "drop-shadow(0 10px 20px rgba(21,39,81,0.12))",
            }}
          />

          <div style={{ position: "relative" }}>
            <CmKicker>Kvar att hantera</CmKicker>
            <div
              className="tabular"
              style={{
                marginTop: 6,
                fontSize: 56,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "rgb(var(--eb-accent))",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cmFmtSek(animated)}
            </div>
            <p
              style={{
                margin: "8px auto 0",
                maxWidth: 460,
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgb(var(--eb-text) / 0.65)",
              }}
            >
              April blev tryggt över budget. Välj var beloppet ska landa innan vi stänger månaden.
            </p>
          </div>
        </div>

        {/* Decision — two big tradeoff cards */}
        <div style={{ padding: "20px 32px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <HeroOption
            selected={mode === "full"}
            onClick={() => setMode("full")}
            kicker="För över"
            title="Maj 2026 får +1 240,50 kr"
            body="Beloppet blir tillgängligt i maj och förstärker nästa månads plan."
            illo={<MoneyForward />}
          />
          <HeroOption
            selected={mode === "none"}
            onClick={() => setMode("none")}
            kicker="Behåll"
            title="Stanna i april"
            body="Beloppet sparas som överskott i april-vyn och syns i historiken."
            illo={<MoneyKeep />}
          />
        </div>

        {/* Subtle summary, collapsed feel */}
        <div style={{ padding: "0 32px 8px" }}>
          <div
            style={{
              borderRadius: 16,
              background: "rgb(var(--eb-shell) / 0.18)",
              border: "1px solid rgb(var(--eb-stroke) / 0.25)",
              padding: "12px 18px",
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              gap: 16,
            }}
          >
            <HeroStat label="Inkomster" value={`+${cmFmtSek(income, { fractionDigits: 0 })}`} tone="positive" />
            <HeroStat label="Utgifter" value={`\u2212${cmFmtSek(expenses, { fractionDigits: 0 })}`} />
            <HeroStat label="Sparande & skulder" value={`\u2212${cmFmtSek(savingsDebt, { fractionDigits: 0 })}`} />
            <HeroStat label="Kvar" value={cmFmtSek(surplus)} tone="positive" emphasized />
          </div>
        </div>

        <p style={{ margin: "12px 32px 18px", fontSize: 12, lineHeight: 1.55, color: "rgb(var(--eb-text) / 0.55)" }}>
          Stämmer inte siffrorna? Avbryt och justera månaden innan du stänger den.
        </p>

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "16px 32px",
            borderTop: "1px solid rgb(var(--eb-stroke) / 0.1)",
            background: "rgb(255 255 255 / 0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ fontSize: 12, color: "rgb(var(--eb-text) / 0.55)" }}>
            Du kan alltid gå tillbaka och läsa april efteråt.
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <CmCta variant="secondary">Avbryt</CmCta>
            <CmCta variant="primary">
              Stäng april 2026
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 6 19 12 13 18" />
              </svg>
            </CmCta>
          </div>
        </footer>
      </div>
    </CmPageWrap>
  );
}

function HeroOption({ selected, onClick, kicker, title, body, illo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 18px",
        borderRadius: 20,
        border: selected
          ? "1.5px solid rgb(var(--eb-accent) / 0.55)"
          : "1px solid rgb(var(--eb-stroke) / 0.3)",
        background: selected
          ? "linear-gradient(180deg, rgb(220,252,231,0.55), rgb(220,252,231,0.18))"
          : "rgb(255 255 255 / 0.92)",
        cursor: "pointer",
        fontFamily: "inherit",
        boxShadow: selected
          ? "0 12px 28px rgb(34 197 94 / 0.18)"
          : "0 6px 18px rgba(21,39,81,0.05)",
        transform: selected ? "translateY(-1px)" : "translateY(0)",
        transition: "background 200ms, border-color 200ms, box-shadow 200ms, transform 200ms",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <CmKicker tone={selected ? "accent" : "muted"}>{kicker}</CmKicker>
          <span style={{ fontSize: 15, fontWeight: 700, color: "rgb(var(--eb-text))", letterSpacing: "-0.01em" }}>
            {title}
          </span>
        </div>
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 9999,
            border: selected ? 0 : "1.5px solid rgb(var(--eb-stroke) / 0.55)",
            background: selected ? "rgb(var(--eb-accent))" : "transparent",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
            transition: "background 200ms, border-color 200ms",
          }}
        >
          {selected ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgb(var(--eb-text) / 0.65)" }}>{body}</p>
      <div style={{ marginTop: 4, alignSelf: "flex-end", color: "rgb(var(--eb-text) / 0.45)" }}>{illo}</div>
    </button>
  );
}

function HeroStat({ label, value, tone, emphasized }) {
  const valueColor =
    tone === "positive"
      ? "rgb(var(--eb-accent))"
      : "rgb(var(--eb-text))";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgb(var(--eb-text) / 0.5)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span
        className="tabular"
        style={{
          fontSize: emphasized ? 16 : 14,
          fontWeight: 700,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// tiny inline illos — arrows that signal "carry over" vs "keep"
function MoneyForward() {
  return (
    <svg width="38" height="20" viewBox="0 0 38 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="10" x2="32" y2="10" />
      <polyline points="26 4 32 10 26 16" />
      <circle cx="3" cy="10" r="2.4" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}
function MoneyKeep() {
  return (
    <svg width="38" height="20" viewBox="0 0 38 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="4" width="26" height="12" rx="3" />
      <circle cx="19" cy="10" r="2.5" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}

window.ReviewHero = ReviewHero;
