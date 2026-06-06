// Faithful rebuild of CloseMonthReviewModal.tsx — Swedish locale, the surplus
// branch (positiveRemaining). This is the "before" so the redesign can be
// compared side-by-side.

function ReviewBaseline() {
  const [mode, setMode] = React.useState("full"); // "full" | "none"

  // Numbers mirror the demo dataset used in the other uploads.
  const incoming = 0;
  const income = 70020;
  const expenses = 59535;
  const savingsDebt = 8039.54 + 2535; // sparande + skulder
  const remaining = income - expenses - savingsDebt; // -89.54 in the upload set
  // Demo here: surplus branch — we override so we can show the surplus options.
  const surplus = 1240.5;

  return (
    <CmPageWrap height="100%" padded>
      <CmDecorBlobs />
      {/* dimmed scrim hint, since this is shown as a modal */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgb(15 23 42 / 0.08)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 640,
          maxWidth: "100%",
          margin: "20px auto 0",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,255,0.96))",
          border: "1px solid rgb(var(--eb-stroke) / 0.2)",
          borderRadius: 24,
          boxShadow: "0 28px 80px rgba(21,39,81,0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "26px 32px 16px" }}>
          <CmKicker>Månadsstängning</CmKicker>
          <h2
            style={{
              margin: "8px 0 6px",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: "rgb(var(--eb-text))",
              lineHeight: 1.15,
            }}
          >
            Stäng april 2026?
          </h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgb(var(--eb-text) / 0.65)", maxWidth: 520 }}>
            När månaden stängs sparas en historisk vy av dina siffror. Du kan alltid gå tillbaka och läsa den.
          </p>
        </div>

        <div style={{ padding: "0 32px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Surplus intro */}
          <div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgb(var(--eb-text) / 0.85)" }}>
              Du har <span style={{ fontWeight: 600 }}>{cmFmtSek(surplus)}</span> kvar att hantera.
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgb(var(--eb-text) / 0.6)" }}>
              Välj om beloppet ska följa med till nästa månad eller stanna i april.
            </p>
          </div>

          {/* Radio cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BaselineOption
              selected={mode === "full"}
              onClick={() => setMode("full")}
              title="För över till maj 2026"
              body="Beloppet blir tillgängligt i nästa månads plan."
            />
            <BaselineOption
              selected={mode === "none"}
              onClick={() => setMode("none")}
              title="Behåll i april"
              body="Beloppet sparas som överskott i april-vyn."
            />
          </div>

          {/* Summary block */}
          <section
            style={{
              borderRadius: 16,
              background: "rgb(var(--eb-shell) / 0.2)",
              padding: "14px 20px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgb(var(--eb-text) / 0.55)",
              }}
            >
              Månadens siffror
            </h3>
            <dl style={{ margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
              <BaselineRow label="Inkomster" value={`+${cmFmtSek(income)}`} />
              <BaselineRow label="Utgifter" value={`\u2212${cmFmtSek(expenses)}`} />
              <BaselineRow label="Sparande & skulder" value={`\u2212${cmFmtSek(savingsDebt)}`} />
              <div style={{ paddingTop: 6 }}>
                <BaselineRow label="Kvar" value={cmFmtSek(surplus)} emphasized />
              </div>
            </dl>
          </section>

          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "rgb(var(--eb-text) / 0.55)" }}>
            Stämmer inte siffrorna? Avbryt och justera månaden innan du stänger den.
          </p>

          <button
            type="button"
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: 0,
              padding: 0,
              fontSize: 12,
              fontWeight: 500,
              color: "rgb(var(--eb-text) / 0.55)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Vad händer när jag stänger månaden?
          </button>
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            padding: "16px 32px",
            borderTop: "1px solid rgb(var(--eb-stroke) / 0.1)",
            background: "rgb(255 255 255 / 0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <CmCta variant="secondary">Avbryt</CmCta>
          <CmCta variant="primary">Stäng april 2026</CmCta>
        </footer>
      </div>
    </CmPageWrap>
  );
}

function BaselineOption({ selected, onClick, title, body }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 16px",
        borderRadius: 16,
        border: selected
          ? "1px solid rgb(var(--eb-accent) / 0.55)"
          : "1px solid rgb(var(--eb-stroke) / 0.25)",
        background: selected ? "rgb(34 197 94 / 0.06)" : "rgb(255 255 255 / 0.85)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 180ms ease-out, border-color 180ms ease-out",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--eb-text))" }}>{title}</span>
        <span
          aria-hidden
          style={{
            width: 20,
            height: 20,
            borderRadius: 9999,
            border: selected ? "0" : "1px solid rgb(var(--eb-stroke) / 0.4)",
            background: selected ? "rgb(var(--eb-accent))" : "rgb(255 255 255)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flex: "0 0 auto",
          }}
        >
          {selected ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
        </span>
      </div>
      <span style={{ fontSize: 12, lineHeight: 1.55, color: "rgb(var(--eb-text) / 0.6)" }}>{body}</span>
    </button>
  );
}

function BaselineRow({ label, value, emphasized }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
      <dt
        style={{
          fontSize: 14,
          fontWeight: emphasized ? 600 : 400,
          color: emphasized ? "rgb(var(--eb-text))" : "rgb(var(--eb-text) / 0.72)",
        }}
      >
        {label}
      </dt>
      <dd
        className="tabular"
        style={{
          margin: 0,
          fontSize: emphasized ? 16 : 14,
          fontWeight: emphasized ? 600 : 500,
          color: emphasized ? "rgb(var(--eb-text))" : "rgb(var(--eb-text) / 0.85)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </dd>
    </div>
  );
}

window.ReviewBaseline = ReviewBaseline;
