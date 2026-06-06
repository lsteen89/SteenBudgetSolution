# PR 2 — Replace `ClosedMonthHandoffCard` with the V2 full-takeover interstitial

| | |
| --- | --- |
| **Type** | Frontend UI |
| **Depends on** | PR 1 (`useCountUp`, mascot import pattern, `YearChapterStrip`) |
| **Blocks** | — |
| **Risk** | Medium — full-screen overlay; dismiss path must be airtight |

---

## 1. Why this PR exists

Today's "just closed" handoff is a small green strip rendered above the
recap. The chosen redesign (`design/HandoffTakeover.jsx`) replaces it with a
**brief full-screen interstitial** — the dopamine peak of the close moment.

Direction (from `design/chat-transcript.md`):

- "Stängd · sparad" stamp settles into place with a slight tilt
- `RichBird` stands beside it
- Year strip shows the just-closed dot landing green
- Three calm number panels: income, expenses, carried-over amount
- **One** primary CTA: "Fortsätt till {nextMonth}"
- Small "Stanna i april en stund" link + top-right X for the stay path
- One-shot soft confetti (low density, brand palette)
- Session-only, manual dismiss

## 2. Source design

Primary:

- `Work/Dashboard/CloseMonth/design/HandoffTakeover.jsx` — target
- `Work/Dashboard/CloseMonth/design/shared.jsx` — `CmConfetti`,
  `CmYearStrip`, `useCountUp`, formatters
- `Work/Dashboard/CloseMonth/design/HandoffBaseline.jsx` — current
  implementation, for diff
- `Work/Dashboard/CloseMonth/design/HandoffConfetti.jsx` — V1 inline variant,
  **not chosen** (kept for reference only)

Mascot asset to import:

- source: `Work/Dashboard/CloseMonth/design/mascots/RichBird.png`
- destination: `Frontend/src/assets/Images/RichBird.png`

## 3. Files this PR will change

**Modify**

- `Frontend/src/components/organisms/dashboard/closeMonth/ClosedMonthHandoffCard.tsx`
  — replace the inline green strip with the takeover. Keep the file name and
  exported component name so `DashboardContent.tsx` does not need a rename.
  Adjust props if needed (see §4).
- `Frontend/src/utils/i18n/pages/private/dashboard/closeMonth/ClosedMonthHandoffCard.i18n.ts`
  — add takeover-specific keys (sv / en / et). Keep the existing
  `title`/`continue`/`body*`/`dismissAria` keys; reuse where the copy fits.
- `Frontend/src/components/organisms/pages/DashboardContent.tsx` — pass
  `closedMonthsInYear` and `yearMonthList` props (already added in PR 1) plus
  any new ones the takeover needs (e.g. `monthlyIncome`, `monthlyExpenses`).

**Add**

- `Frontend/src/assets/Images/RichBird.png`.
- A new shared primitive `Frontend/src/components/atoms/decor/SoftConfetti.tsx`
  — port of `CmConfetti`: low density, brand palette, one-shot.
  Honor `useReducedMotion` (render nothing).

**Reuse from PR 1**

- `useCountUp` — extract from the modal into
  `Frontend/src/hooks/animation/useCountUp.ts` during PR 2 so both surfaces
  share it.
- `YearChapterStrip` — extract into
  `Frontend/src/components/atoms/dashboard/YearChapterStrip.tsx`. Both PR 1
  and PR 2 use it.

**Do not touch**

- The close mutation, controller, or backend.
- `CloseMonthReviewModal.tsx` (PR 1).
- `ClosedMonthRecapSection.tsx` and its detail blocks.

## 4. Implementation outline

### 4.1 Mount and lifecycle

Mount via React Portal at `document.body`. The takeover overlays the
dashboard so april remains underneath — the "Stanna i april en stund" link
just dismisses, it does not navigate.

Trigger condition stays exactly as today:
`closeMonthReview.justClosed?.closedYearMonth === yearMonth`. When the user
dismisses (Continue / Stanna / X / ESC) call `onDismiss`, which today maps
to `closeMonthReview.dismissJustClosed()` — keep that wiring.

Session-only by design. The next dashboard load will not re-show the
takeover because `justClosed` is only set by `confirm()` in the controller.

### 4.2 Layout (top → bottom)

Backdrop: `radial-gradient(120% 80% at 50% -10%, rgb(220,252,231) 0%, rgb(239,246,255) 35%, rgb(219,234,254) 100%)`.
Decorative blobs from `design/shared.jsx` ported as a small CSS-only
component (`<DecorBlobs />`, render-only).

1. **Top-right X** — circular button, 36 × 36, `--eb-surface/75` with
   backdrop-blur, calls `onDismiss`. `aria-label` from i18n.
2. **Kicker** — `t("kicker")` "Månaden är stängd" / "Month is closed".
3. **Headline** — `t("headline")` with `{month}` token, 44 px / 800
   weight, `--eb-text`.
4. **Subhead** — `t("subhead")` with `{nextMonth}` + `{amount}` tokens
   ("En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen
   — och har fått {amount} med sig på vägen.").
5. **Stamp + mascot row** — `RichBird` (132 × 132) + `<Stamp month=...
   year=... />` rotated ‑7°, accent border, repeating-stripe paper grain.
6. **Year card** — soft surface card with kicker "Året {year}",
   `closedThrough / 12 månader stängda` count on the right,
   `<YearChapterStrip closedThrough={closedMonthsInYear} highlightLast
   size="md" />` below.
7. **3-panel number strip** — income / expenses / carried-over. Use
   `useCountUp` on all three; accent the carry-over panel.
8. **Primary CTA** — `t("continue")` with `{nextMonth}` token, 52 px tall,
   right-arrow icon. Calls `onContinue`.
9. **Soft dismiss link** — `t("stayLink")` with `{monthOnly}` token. Calls
   `onDismiss`.
10. **Read-only line** — `t("readOnlyNote")` (small, muted).

### 4.3 Variants by `resolveVariant(finalBalance, carryOverMode)`

Preserve the existing variant resolver:

- `positiveFull` — copy emphasizes amount carried to next month
- `positiveKept` — copy emphasizes amount kept in the closing month
- `balanced` — drop the "+amount" subhead clause; show three-panel strip
  without the third accent panel
- `deficit` — calm copy, no shame, no green stamp. The stamp reads "Stängd"
  only (drop "· sparad"), and the carry-over panel is replaced with a
  neutral "Inget överskott den här månaden" panel. Keep RichBird, but mute
  the confetti density to ~12 pieces.

### 4.4 Confetti

`<SoftConfetti pieces={48} spreadX={620} spreadY={520} />` mounted once on
takeover open. Reads as shimmer, not party popper. Brand palette only:
`--eb-accent`, lime accent, shell-2 blue, accent-soft, `--eb-text` for a few
darker chips. One-shot — CSS animation, no JS loop. Skip entirely on
`useReducedMotion`.

For the `deficit` variant: reduce `pieces` to ~12 and mute the palette to
neutral chips only.

### 4.5 Focus and a11y

- Render with `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the
  headline.
- Trap focus inside the takeover while it's open.
- ESC fires `onDismiss`.
- Restore focus to the close-month button (or its replacement) on dismiss.
- `aria-live="polite"` on a small SR-only summary node so screen readers
  hear "April 2026 är stängd, X kr fördes över till maj 2026."

### 4.6 Reduced motion

Skip: confetti, mascot float, stamp settle, headline rise. Render in the
final state, no count-up (set value to target immediately).

## 5. i18n keys to add (sv / en / et)

Add to `closedMonthHandoffCardDict`. Reuse existing keys
(`title`/`continue`/`body*`/`dismissAria`) where the copy maps cleanly;
otherwise add fresh keys named for the takeover. Suggested new keys:

| Key | sv | en | et |
| --- | --- | --- | --- |
| `kicker` | `Månaden är stängd` | `Month is closed` | `Kuu on suletud` |
| `headline` | `{month} är sparad` | `{month} is saved` | `{month} on salvestatud` |
| `subheadPositive` | `En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen — och har fått {amount} med sig på vägen.` | `A historical summary is saved. {nextMonth} is already open — and gets {amount} along for the ride.` | `Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud — ja sai {amount} kaasa.` |
| `subheadBalanced` | `En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen.` | `A historical summary is saved. {nextMonth} is already open.` | `Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud.` |
| `subheadDeficit` | `En historisk sammanfattning är skapad. {nextMonth} ligger redan öppen — du kan börja om där.` | `A historical summary is saved. {nextMonth} is already open — you can start fresh there.` | `Ajalooline kokkuvõte on salvestatud. {nextMonth} on juba avatud — sa võid sealt uuesti alustada.` |
| `stampSavedSuffix` | `· sparad` | `· saved` | `· salvestatud` |
| `yearLabel` | `Året {year}` | `Year {year}` | `Aasta {year}` |
| `yearProgress` | `{closed} / 12 månader stängda` | `{closed} / 12 months closed` | `{closed} / 12 kuud suletud` |
| `panelIncome` | `Inkomster i {month}` | `Income in {month}` | `Tulud kuus {month}` |
| `panelExpenses` | `Utgifter i {month}` | `Expenses in {month}` | `Kulud kuus {month}` |
| `panelCarriedOver` | `Fördes över till {nextMonth}` | `Carried over to {nextMonth}` | `Kanti üle kuusse {nextMonth}` |
| `panelKept` | `Stannade i {month}` | `Kept in {month}` | `Jäi kuusse {month}` |
| `panelNoSurplus` | `Inget överskott den här månaden` | `No surplus this month` | `Sel kuul ülejääki ei tekkinud` |
| `continueTakeover` | `Fortsätt till {nextMonth}` | `Continue to {nextMonth}` | `Jätka kuusse {nextMonth}` |
| `stayLink` | `Stanna i {monthOnly} en stund` | `Stay in {monthOnly} for a moment` | `Jää veel kuusse {monthOnly}` |
| `readOnlyNote` | `Historiken är skrivskyddad — du kan alltid komma tillbaka och läsa {month}.` | `History is read-only — you can always come back and read {month}.` | `Ajalugu on kirjutuskaitstud — saad alati tagasi tulla ja {month} lugeda.` |
| `closeButtonAria` | `Stäng översikten` | `Close the overview` | `Sulge ülevaade` |

## 6. Files DashboardContent must change

The `ClosedMonthHandoffCard` block currently sits at
`DashboardContent.tsx:312–325` inside the `isClosedMonth` branch. The
takeover overlays everything, so:

- Render the recap section *under* the takeover (same DOM structure as
  today; the portal sits on top).
- Pass new props the takeover needs:
  `monthlyIncome`, `monthlyExpenses`, `closedMonthsInYear`, `yearMonthList`,
  `locale` (already passed implicitly via locale hook in PR 1).
- The "Continue with next month" action in `PeriodControlBar` should remain
  suppressed while the takeover is visible (existing
  `isJustClosedHandoffVisible` flag at `DashboardContent.tsx:285` already
  does this — keep it).

## 7. Tests

Existing tests to preserve:

- `Frontend/src/components/organisms/dashboard/closeMonth/__tests__/ClosedMonthHandoffCard.test.tsx`
  — update structure to match the new layout but keep the variant matrix
  (`positiveFull`, `positiveKept`, `balanced`, `deficit`).

Add:

- Takeover renders as a portal under `document.body` and is removed on
  dismiss.
- ESC + top-right X + Continue + Stay link all fire `onDismiss` /
  `onContinue` correctly.
- Reduced-motion mode: no confetti, no count-up animation.
- Deficit variant uses muted confetti and the "Stängd" stamp without the
  "· sparad" suffix.
- Focus is trapped inside the takeover and restored on close.

## 8. Validation

- [ ] `npm run lint` clean
- [ ] `npm run test` clean
- [ ] `npm run test:e2e:smoke` clean (handoff smoke especially)
- [ ] Manually close april in dev for each carry-over mode (`full`,
  `none`) and the deficit shape — confirm the right variant fires.
- [ ] Confirm tab-trap, ESC, and click-outside behaviour.
- [ ] Confirm the recap section sits correctly underneath when the
  takeover is dismissed.

## 9. Risks and pitfalls

- **Portal vs. layout.** The takeover must overlay every dashboard chrome
  (header, period control bar, recap). Render it via portal, do **not** try
  to push it into the dashboard's normal flex flow.
- **Scroll lock.** Lock body scroll while the takeover is visible
  (matches existing modal pattern). Restore on dismiss.
- **Mascot loaded eagerly.** Preload `RichBird.png` once close fires
  (kick off in the `onConfirm` resolver) so it's cached when the takeover
  paints.
- **Confetti perf.** 48 elements is fine; if the device hints at low perf
  (small screens or `prefers-reduced-motion`), skip confetti entirely.
- **Deficit copy must stay calm.** Brand voice: no "oops", no apology, no
  shame. The stamp drops "· sparad" but does not turn red. Run new copy by
  the brand voice rules in `.agents/instructions/frontend-ui.instructions.md`.
- **Test ID drift.** Smoke E2E asserts on `closed-month-handoff-card`,
  `closed-month-handoff-continue`, `closed-month-handoff-dismiss`. Keep
  these test IDs on the new component's equivalents.
