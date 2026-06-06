# PR 1 — Rebuild `CloseMonthReviewModal` around the Hero Remaining layout

| | |
| --- | --- |
| **Type** | Frontend UI |
| **Depends on** | Nothing |
| **Blocks** | PR 2 (shared primitives) |
| **Risk** | Medium — central financial confirmation surface |

---

## 1. Why this PR exists

The pre-close confirmation modal works but reads as a *worksheet*. The chosen
redesign (`design/ReviewHero.jsx`) keeps the calm brand voice but lifts the
moment by:

- pulling "kvar att hantera" into a hero number with a quiet breathing halo
- treating the surplus decision as **two big tradeoff cards** (not small
  radio rows)
- adding a year-chapter ribbon ("kapitel 4 av 12") so closing feels like
  progress
- letting `CalcBird` peek from the corner — friendly, not loud

This PR rebuilds the modal contents while keeping every prop, callback, hook
binding, and `data-testid` unchanged. No controller or backend changes.

## 2. Source design

Primary:

- `Work/Dashboard/CloseMonth/design/ReviewHero.jsx` — target
- `Work/Dashboard/CloseMonth/design/shared.jsx` — `useCountUp`, `cmFmtSek`,
  year-strip, kicker, CTA helpers (do **not** copy verbatim; port the moves
  using existing repo primitives)
- `Work/Dashboard/CloseMonth/design/ReviewBaseline.jsx` — faithful rebuild of
  the *current* modal, for diff/sanity
- `Work/Dashboard/CloseMonth/design/chat-transcript.md` — the chat that locked
  the direction

Mascot asset to import:

- source: `Work/Dashboard/CloseMonth/design/mascots/CalcBird.png`
- destination: `Frontend/src/assets/Images/CalcBird.png`

## 3. Files this PR will change

**Modify**

- `Frontend/src/components/organisms/dashboard/closeMonth/CloseMonthReviewModal.tsx`
  — full internal rebuild. Public component signature (props, callbacks) is
  **unchanged**.
- `Frontend/src/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n.ts`
  — add new keys for sv/en/et (see §5).
- `Frontend/src/components/organisms/pages/DashboardContent.tsx` — derive and
  pass two new props: `closedMonthsInYear: number` and
  `yearMonthList: string[]` (for the year strip).

**Add**

- `Frontend/src/assets/Images/CalcBird.png` — copied from
  `Work/Dashboard/CloseMonth/design/mascots/CalcBird.png`.
- Small internal primitives (kept local to the modal file unless reused
  later):
  - `useCountUp(target, durationMs)` — `requestAnimationFrame` ease-out cubic.
    Honor `useReducedMotion` by setting `value` to `target` immediately.
  - `<YearChapterStrip closedThrough={n} highlight />` — 12 dots / pills,
    rendered statically.
  - `<HeroHalo />`, `<HeroOption />`, `<HeroStat />` — render-only.

**Do not touch**

- `useCloseMonthReviewController` and `closeMonth.types`.
- `ClosedMonthHandoffCard.tsx` (PR 2).
- `ClosedMonthRecapSection.tsx` and its detail blocks.
- The `CompletionCandidatesSection` / `CompletionCandidateRow` internal
  components — keep their layout, copy, and test IDs identical.
- Backend.

## 4. Implementation outline

Reuse the existing `<Dialog>` (shadcn) shell. Replace the modal body with the
following structure (top → bottom):

1. **Top ribbon** (gradient-bottom strip):
   - kicker: `t("chapterRibbon")` rendered as
     `"Månadsstängning · kapitel {closed} av 12"`
   - h2: existing `t("title")` with `{month}` token
   - `<YearChapterStrip closedThrough={closedMonthsInYear} highlight />` on
     the right (min-width 280px, hidden below `sm:`)
2. **Hero remaining** — only when `reviewState.state === "positiveRemaining"`:
   - `<HeroHalo />` (radial gradient with `--eb-accent`, 22% alpha, blur 2px)
   - `CalcBird.png` absolute, top-right, 96 × 96, `aria-hidden`
   - kicker: `t("heroLabel")` ("Kvar att hantera" / "Left to handle")
   - count-up `cmFmtSek` on `summary.remaining`, 56 px / 800 weight /
     `--eb-accent`
   - lead copy: `t("heroLeadPositive")` (max-width 460 px, 14 px,
     `--eb-text/65`)
   For `negativeRemaining`: hero shows absolute overspent amount in rose
   (`text-rose-700`), no halo, no count-up flourish; lead copy:
   `t("heroLeadNegative")`. For `balanced`: omit hero entirely; show only the
   summary block below.
3. **Two tradeoff cards** (`<HeroOption>`):
   - "Carry over": kicker `optionCarryOverKicker`, title
     `optionCarryOverHeroTitle` with `{nextMonth}` + `{amount}` tokens, body
     existing `optionCarryOverBody`, illo small forward-arrow svg
   - "Keep": kicker `optionKeepKicker`, title `optionKeepHeroTitle` with
     `{monthOnly}`, body existing `optionKeepBody`, illo small wallet svg
   Selected state: 1.5 px `--eb-accent/55` border + emerald-tinted gradient
   + soft shadow + 1 px lift; otherwise white card with stroke border.
   Selection state binds to `selectedCarryOverMode` / `onSelectCarryOverMode`.
   Preserve `data-testid="resolve-carry-over"` and
   `data-testid="resolve-keep"`. Preserve `role="radio"` and
   `aria-checked` on the buttons.
4. **Compact 4-col stat strip** — `--eb-shell/18` background, rounded 16,
   stroke border. Columns: incoming carry-over (only when
   `Math.abs(summary.incomingCarryOver) >= NEAR_ZERO`) / income / expenses /
   savings & debt / remaining. Remaining is emphasized + accent-coloured.
   Use existing `formatSigned` / `formatAutoSigned` for signed values.
   Preserve `close-month-summary-*` test IDs on each row.
5. **Adjust hint** — existing `t("adjustHint")`, unchanged.
6. **Completion candidates** — render the existing
   `CompletionCandidatesSection` unchanged below the stat strip if
   `completionCandidates?.length > 0`.
7. **Disclosure** — keep existing `<Disclosure>` block, unchanged.
8. **Footer** — same `<footer>` shell. Left: small note
   `t("footerNote")` with `{month}` token. Right: existing `cancel` +
   primary CTA. CTA gets a trailing right-arrow svg (per design).

Animation rules:

- Wrap the hero number in a `motion.div` only if `!prefersReducedMotion`.
- The halo gets a slow `cm-halo`-equivalent breathing (opacity 0.6 → 1.0 over
  3.2 s ease-in-out, infinite). Skip on `prefersReducedMotion`.
- `<HeroOption>` selection transitions use the existing 200 ms ease-out
  pattern. Honor `motion-reduce:transition-none`.
- The mascot floats with a tiny vertical oscillation (±4 px, 4.8 s
  ease-in-out, infinite); skip on `prefersReducedMotion`.

## 5. i18n keys to add (sv / en / et)

Add to `closeMonthReviewModalDict` for all three locales:

| Key | sv | en | et |
| --- | --- | --- | --- |
| `chapterRibbon` | `Månadsstängning · kapitel {closed} av 12` | `Monthly close · chapter {closed} of 12` | `Kuu sulgemine · peatükk {closed} / 12` |
| `heroLabel` | `Kvar att hantera` | `Left to handle` | `Veel jaotada` |
| `heroLeadPositive` | `{month} blev tryggt över budget. Välj var beloppet ska landa innan vi stänger månaden.` | `{month} stayed comfortably under budget. Pick where the amount should land before we close the month.` | `{month} jäi turvaliselt eelarvesse. Vali, kuhu summa läheb enne kuu sulgemist.` |
| `heroLeadNegative` | `{month} blev överspenderad. Du kan stänga ändå — siffrorna sparas som de är.` | `{month} ended overspent. You can still close — the numbers are saved as they are.` | `{month} jäi miinusesse. Saad sulgeda — numbrid salvestatakse nii nagu nad on.` |
| `optionCarryOverKicker` | `För över` | `Carry over` | `Kanna üle` |
| `optionKeepKicker` | `Behåll` | `Keep` | `Säilita` |
| `optionCarryOverHeroTitle` | `{nextMonth} får +{amount}` | `{nextMonth} gets +{amount}` | `{nextMonth} saab +{amount}` |
| `optionKeepHeroTitle` | `Stanna i {monthOnly}` | `Stay in {monthOnly}` | `Jää kuusse {monthOnly}` |
| `footerNote` | `Du kan alltid gå tillbaka och läsa {month} efteråt.` | `You can always go back and read {month} afterwards.` | `Saad alati hiljem {month} kuuga tagasi minna ja lugeda.` |

Reuse existing keys where possible: `title`, `cancel`, `confirm`,
`summaryIncome | Expenses | SavingsDebt | Remaining | IncomingCarryOver`,
`adjustHint`, `disclosure*`, `completionCandidate*`, `negativeNotice`,
`snapshotLabel`.

## 6. Data the modal needs

Derive in `DashboardContent.tsx` before passing into the modal:

- `closedMonthsInYear: number` — count of `archiveMonths` where
  `status === "closed"` and `yearMonth.startsWith(currentYear)`.
- `yearMonthList: string[]` — the 12 `YYYY-MM` keys for the current year, in
  order. Used by `YearChapterStrip` to label each pill on hover/title.

Both are presentational. Pass as new props on `CloseMonthReviewModal`.

## 7. Tests

Existing tests to preserve:

- `Frontend/src/components/organisms/dashboard/closeMonth/__tests__/CloseMonthReviewModal.completion.test.tsx`
  — completion-candidates flow must keep working. Test IDs unchanged.

Update or add:

- Add a test that asserts `chapterRibbon` renders with the right token
  substitution when `closedMonthsInYear={3}`.
- Add a test that asserts the hero number reads `summary.remaining` after
  count-up settles (use `act(...)` + advance timers).
- Add a snapshot or DOM test that the hero is **not** rendered for
  `reviewState.state === "balanced"`.

## 8. Validation

Local validation checklist before writing `COMMIT_MSG.tmp`:

- [ ] `npm run lint` clean
- [ ] `npm run test` clean (Frontend unit tests)
- [ ] `npm run test:e2e:smoke` clean (close-month smoke specs especially)
- [ ] Manually open the modal in dev for each `reviewState`: positive,
  negative, balanced. Confirm hero, tradeoff cards, stat strip, completion
  candidates, disclosure, footer all render correctly.
- [ ] Toggle `prefers-reduced-motion` and confirm halo, mascot float, and
  count-up all stop.
- [ ] Switch locale to `en` and `et` — all new copy renders without
  `{token}` leaks.

## 9. Risks and pitfalls

- **Hero hierarchy fighting the summary strip.** Keep the strip muted — small
  10–12 px labels, 14 px values. The hero is the focal point.
- **Mascot license/asset.** `CalcBird.png` comes from the design bundle,
  already brand-consistent. Place under `Frontend/src/assets/Images/` next to
  the other birds; import via the existing pattern.
- **Year strip when `archiveMonths` is empty** (first-time / first month).
  Render the strip with `closedThrough=0`, all pills neutral, no highlight.
- **Reduced-motion** must kill all three motion sources (halo, mascot float,
  count-up). Easy to forget the halo since it's CSS-only — gate it behind a
  `data-reduce-motion` attribute on the modal root.
- **Test ID drift.** Smoke E2E asserts on `confirm-close-month`,
  `close-month-modal`, `resolve-carry-over`, `resolve-keep`, and
  `close-month-summary-*`. Do not rename.
