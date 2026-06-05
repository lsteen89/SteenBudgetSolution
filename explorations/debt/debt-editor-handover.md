# Debt Editor — Implementation Handover (complete)

**Date:** 2026-05-30
**Audience:** the engineer/agent implementing the Debt editor in `SteenBudgetSolution`, and product reviewing scope.
**Status:** design direction ready for review + PR breakdown.
**Replaces:** the earlier split docs (`debt-editor-implementation-handover.md` v1 + `debt-editor-target-handover.md` v2). This is the single source.

---

## 0. What you are getting

| File | Role |
|---|---|
| `explorations/debt/MVP-Debt v2.html` | **Target-state source of truth.** The full debt management editor. Click every kebab, open every flow, flip the Tweaks. Build to match it. |
| `explorations/debt/MVP-Debt v1.html` | The minimal **ships-today (Stage 0)** version — keep as the stage-1 reference if you ship incrementally. |
| `explorations/income/MVP-Income v1.html` + its handover | The sibling editor whose shell/type/row/drawer grammar Debt reuses. Read it — Debt is the next instance of the same money-flow editor. |
| This document | The complete bridge: scope, the honesty rule, page anatomy, every flow, and the backend-PR staging map. |

> The mockups are **fidelity references, not shippable code.** One HTML file each, inline JS + a Tweaks panel. Do **not** port the inline JS, the `data-*` mock attributes, or the Tweaks panel. Rebuild the structure with the existing React/TS components, eBudget tokens, i18n dictionaries, and the shared editor primitives extracted during the income work (`components/molecules/forms/budgetEditor/*`) — don't copy-paste.

### How the scope evolved (so the history is clear)
- **v1** designed *only* around today's backend: the sole editable thing was the planned monthly payment; add / mark-paid / skip / update-balance / progress were a fenced "future" appendix.
- **v2 (this target)**: the decision is to **build the missing backend**, so those features move into the **main UX**. The design is ambitious enough for the full experience but **staged** (§6) so engineering can ship safely. Every backend-dependent control is **visibly marked** (`Kräver backend` / `PR`, toggleable).

---

## 1. One-line frame

**Debt is one outflow with two faces, plus a lifecycle.** Keep **three** concepts separate, always:

1. **Planerad månadsbetalning** — a planned outflow that reduces *this month's* remaining money. Editable.
2. **Saldo (Kvar att betala)** — a liability snapshot. It changes **only** through *Uppdatera saldo* or real payment history — **never** because a planned payment was edited.
3. **Livscykel** — whether the debt participates this month (`Betalas` / `Ingår inte`) or at all (`Betald` / `Arkiverad`).

If any screen ever lets the reader believe "I lowered my payment (or skipped this month), so I owe less" — the design has failed. Every decision below exists to prevent that.

The honest equation Debt participates in (same as the other editors):
```
inkomst + överskott − utgifter − sparande − skulder(betalningar) = kvar
```
Balance is **not** a term in that equation. It is shown as a parallel snapshot, visually fenced off.

---

## 2. Financial-honesty rule (non-negotiable)

- The edit-payment drawer keeps the callout **"Saldo påverkas inte här."**
- The **skip** confirm states **"Saldot … står kvar — du är fortfarande skyldig beloppet."**
- The total-balance snapshot notes it **includes skipped debts** (still owed).
- **Update balance** is the *only* place saldo changes by hand, framed as a calm rättelse — *ingen värdering*.

**Copy stays calm, neutral, non-judgmental.** No `bad debt` / `debt problem` / `failure`. No aggressive red just because debt exists. No payoff celebration. Real financial warnings only (below-minimum payment → **calm amber**, never red-alarm). All Swedish strings are placeholders for i18n — don't hardcode.

Preferred vocabulary: `Skulder · Månadsbetalningar · Kvar att betala · Planerad månadsbetalning · Betalas denna månad · Ingår inte denna månad · Betald · Avslutad · Arkiverad · Uppdatera saldo · Hoppa över denna månad · Lägg till skuld · Saldo påverkas inte av att du ändrar planerad betalning`.

---

## 3. Reuse the money-flow editor grammar

Same shell as Expenses/Income/Savings: sticky glass header, decor blobs, compact hero, a supporting strip, grouped ledger cards, right-aligned tabular money, quiet rows with inline pills only for exceptions, a row kebab, and scope-aware drawers with a footer of `Avbryt` + a single primary action. By the time a user reaches Debt, the other editors already taught them how every editor behaves — Debt should feel familiar, not dramatic.

---

## 4. Page anatomy (target)

1. **Hero** — `Du planerar att betala {payments} på skulder denna månad`, the type split, a primary **`Lägg till skuld`** CTA, a `Kvar att betala {balance}` snapshot pill (styled distinctly from flow numbers), and a `{remaining} kvar i budget` pill. Three numbers, three distinct roles. Read-only pill when the month is closed; the CTA hides in read-only.
2. **Backend-marker legend** — one line explaining the `Kräver backend` markers (only visible while the markers tweak is on).
3. **Payment / balance strip** — two fenced zones:
   - `PÅVERKAR MÅNADEN`: `Månadsbetalningar −{x}` + `Kvar efter inkomst, utgifter, sparande & skulder {y}`.
   - `ÖGONBLICKSBILD`: `Kvar att betala — totalt {z}`, with the note that it includes skipped debts.
   - A proportional bar splits the month's payments by type (Lån / Kreditkort / Avbetalning), blue family only.
   - **Balance prominence** has three layouts (Tweak): `lead` (default) / `coequal` / `card`.
4. **Ledger grouped by lifecycle / participation** (not by type — type is a per-row dot + meta chip):
   `Betalas denna månad` → `Ingår inte denna månad` → `Betald · Avslutad` → `Arkiverad` (collapsed disclosure). Active & skipped rows carry an inline **repayment-progress** bar (Tweak-toggleable, backend-gated).
5. **Row actions (kebab)** — vary by lifecycle (§5).
6. **Modals** — one multi-mode **form drawer** (add / edit payment / update balance / edit metadata), one **confirmation** dialog (mark paid / skip / include / archive / restore), one **progress** view.
7. **States** — normal / empty / read-only-closed (Tweak).

### Rows
Because each row carries **two money values**, a one-time desktop column header labels them: `Kvar att betala` and `Planerad · per månad`. On mobile the row stacks with inline labels. Layout: **type dot + name + meta (left) · balance (navy, secondary) · planned payment (bold, primary) · kebab.** Meta is plain text (`Typ · ränta {apr} · minst {min} kr`, plus `avgift {fee} kr/mån` where it exists), not pills.

Exception pills (quiet, only when meaningful): `Bara {månad}` (month-only), `Ändrad i {månad}` (**requires the backend comparison field — Stage 4 — otherwise do not show**), `Ingår inte i {månad}` (skipped), `Betald` (paid).

---

## 5. Lifecycle groups & row kebabs

| Group (`data-lc`) | Rows | Kebab actions |
|---|---|---|
| `active` — **Betalas denna månad** | participating; planned payment counts | Redigera planerad betalning · *Uppdatera saldo* · *Visa förlopp* · *Redigera uppgifter* — *Hoppa över denna månad* · *Markera som betald* · *Arkivera* |
| `skipped` — **Ingår inte denna månad** | paused this month; balance stands; 0 to month total | *Inkludera i maj* · Redigera planerad betalning · *Uppdatera saldo* · *Visa förlopp* — *Markera som betald* · *Arkivera* |
| `paid` — **Betald · Avslutad** | balance 0; excluded from totals | *Visa förlopp* · *Arkivera* |
| `archived` — **Arkiverad** (collapsed) | hidden from planning | *Återställ skuld* · *Visa förlopp* |

*Italic* = needs a backend PR (§6). Only **Redigera planerad betalning** ships with zero backend work.

---

## 6. The flows (all in the mockup)

- **Add debt** (`form`/add): Namn, Typ, Saldo, Ränta, Minsta betalning, Månadsavgift, Löptid, Planerad månadsbetalning + month-only callout + scope cards (default `Denna månad + planen framåt`). The entered saldo is the debt's starting balance.
- **Edit planned payment** (`form`/payment): read-only facts, big-amount input, min-payment guard (calm amber), *Saldo påverkas inte* callout, scope cards (plan scopes disabled for month-only rows), neutral live preview. **Ships today (Stage 0).**
- **Update balance** (`form`/balance): big-amount for the new saldo, calm "rättelse — ingen värdering" framing, explicit "rör inte din planerade betalning."
- **Edit metadata** (`form`/meta): name/type/ränta/min/fee/term. Balance + planned payment have their own flows (not edited here).
- **Mark as paid** (`confirm`/paid): saldo → 0, removed from future planned payments, reversible. Moves to Betald.
- **Skip this month** (`confirm`/skip): month payments −{payment}, **balance stands**, plan untouched, reversible. Moves to Ingår inte.
- **Include again / Restore / Archive** (`confirm`): the obvious inverses.
- **Repayment progress** (`progress`): % paid, paid-vs-remaining, a 6-month balance-history mini-chart. Entirely dependent on stored balance/payment history.

### Edit drawer ordering (payment mode)
read-only facts → the one editable field → balance-not-affected callout → scope (plan-linked only) → live preview → footer (`Avbryt` + `Spara`). Scope values: `currentMonthOnly` (default) · `currentMonthAndBudgetPlan` · `budgetPlanOnly`. Plan-writing scopes require `SourceDebtItemId != null`; month-only rows disable them with a plain reason. Preview deltas are **neutral (navy)**, never green/red; the free-money cell shows the honest trade-off (more payment → less free this month) quietly.

---

## 7. Backend-PR staging map

The design is layered so engineering can ship in order. Each later stage is **purely additive** — earlier stages remain shippable alone. In the mockup, every Stage 1–4 control carries a `Kräver backend` / `PR` marker (toggle "Markera backend-beroenden", default on); turn it off to preview the finished, unmarked experience.

| Stage | Ships | Backend work |
|---|---|---|
| **0 — today** | Read debts for the open month; **edit planned payment** with scope (`currentMonthOnly` / `currentMonthAndBudgetPlan` / `budgetPlanOnly`); read-only closed months; month-only rows. | none (this is v1) |
| **1 — lifecycle: participation** | `Hoppa över denna månad` / `Inkludera i maj`; the `Ingår inte denna månad` group. | per-month participation flag on the month debt row (e.g. `IsIncludedThisMonth`); month totals exclude skipped rows; **balance untouched**. |
| **2 — lifecycle: closure** | `Markera som betald`, `Betald · Avslutad` group, `Arkivera` / `Återställ`, `Arkiverad` group. | debt lifecycle status (`active / paid / archived`) + paid-date; closure sets balance 0 and removes future planned payments. |
| **3 — editable balance & metadata** | `Uppdatera saldo`; `Redigera uppgifter` (name/type/APR/fee/min/term); `Lägg till skuld`. | mutable debt fields after onboarding + a balance-adjustment record; create-debt endpoint that materialises a month row (and optionally a plan row, per scope). |
| **4 — history & progress** | inline row progress bars; the `Återbetalningsförlopp` view; the `Ändrad i {månad}` pill. | stored per-month balance snapshots + actual-payment history; a comparison field (`sourcePlannedMonthlyPayment`) for the changed pill. |

> **Honesty gate:** until Stage 4 ships, progress bars, the history chart, and the `Ändrad` pill are **illustrative** — do not wire them to inferred frontend math. Add the read models; don't fake balances on the FE.

---

## 8. Data model & API (confirm against the real repo before wiring)

Mirror the Expense/Income editors, swapping the noun to `debt`. The exact tables/routes referenced in the brief (`Work/Dashboard/Debt/*`) live in the app repo — **confirm there before relying on this.** By analogy:

- A **budget-plan** debt row and a **selected budget month** materialized row. Month rows either link to a plan row (`SourceDebtItemId != null`) or are month-only (`== null`).
- Fields readable today: `Name`, `Type` (lån/kreditkort/avbetalning — confirm the real enum), `Balance`, `Apr`, `Fee`, `MinPayment`, `Term`, `PlannedMonthlyPayment`.
- The only field editable **today**: `PlannedMonthlyPayment`, via `PATCH .../debt-items/{id}` with a `scope`. New write surfaces (skip/paid/archive/balance/metadata/create) arrive per the stage map.
- Month debt-payment total sums the participating month rows' planned payments and must **reconcile** to the `Skulder` term on the Income allocation strip and the dashboard. The mockups use **4 500 kr** active payments (matching Income's `−4 500 kr`) and **18 623 kr** `Kvar i budget` (matching Income's `fritt kvar`). Keep the editors consistent.
- **Closed/read-only months** expose no mutation affordances (hide the kebab + CTA) — don't rely only on the backend rejecting writes.

---

## 9. What is mockup-only (not product)

The inline JS, `data-*` attributes, and the **Tweaks panel** (balance prominence / density / show progress / backend-deps / page state) are exploration tooling. The chosen defaults: balance prominence `lead`, comfortable density, progress **shown but backend-gated**, backend-deps markers **on**, page state demonstrates `normal` / `empty` / `readonly` (build all three real states). Rebuild everything else with the shared primitives + i18n.

---

## 10. Acceptance criteria

- [ ] Visually consistent with Expenses/Income/Savings (shell/type/row/drawer), reusing shared editor primitives.
- [ ] Payments / balance / lifecycle never conflated — hero, strip zones, row columns, drawer callouts, skip + total-balance copy all hold the line.
- [ ] Hero leads with planned payment; balance a distinct snapshot; `Kvar i budget` present; `Lägg till skuld` CTA (hidden in read-only).
- [ ] Ledger groups by lifecycle; type is a row attribute; progress bars calm and gated.
- [ ] Each lifecycle has the correct kebab set; every non-Stage-0 action is backend-marked.
- [ ] Add / edit-payment / update-balance / edit-metadata are **distinct** flows with the right fields and callouts.
- [ ] Mark-paid and skip confirmations state their financial effects honestly and are reversible.
- [ ] Min-payment guard is advisory amber, never blocking/red. Scope default `currentMonthOnly`; plan scopes disabled for month-only rows; deltas neutral.
- [ ] Every number reconciles to real backend totals; the month payment total matches the Income/dashboard `Skulder` figure.
- [ ] Read-only closed months show history with no mutation affordances.
- [ ] Empty state calm, with a single `Lägg till skuld` affordance.
- [ ] No copy contains `baseline / default / source`, lifecycle jargon, or shame/alarm framing; no payoff celebration.
- [ ] `npm run build` clean from `Frontend/`; focused vitest for changed debt components/utils; manual pass on `/dashboard/debt` at desktop + mobile; **staged so Stage 0 is shippable before Stages 1–4 land.**

### Manual states to verify
loading · no open month · open editable month · read-only/closed month · empty (no debts) · month-only row edit · plan-linked row edit · `budgetPlanOnly` preview · below-minimum payment entry · planned payments exceed budget (calm warn) · skip → include round-trip · mark-paid → restore · archive → restore · progress view.

---

## 11. Design decisions resolved (don't re-litigate)

- Ledger grouping → **by lifecycle/participation** (was by type in v1); type is a per-row dot + chip.
- Row detail → **balanced**: balance + planned payment as the two money columns, ränta/minsta as quiet meta.
- Balance prominence → **payments lead, balance a fenced snapshot** (default); two alternatives via Tweak.
- MoM, payment, and preview deltas → **neutral**, never green/red.
- Min-payment note → **shown** (a real, permitted warning), calm amber.
- Formerly-future features (add/skip/paid/balance/progress) → **promoted into the main UX**, each backend-marked and staged.

## 12. Still open (product, not blockers)
- Final default for balance prominence (`lead` vs `coequal`).
- Whether to ship Stage 0 alone first, or hold for Stage 1–2 before launch.
- How to frame payoff/progress without becoming a debt-payoff "coach."

---

*Build to the mockup, ship by the stage map. When the mockup and this document disagree, this document wins; when either disagrees with backend reality, financial honesty wins — keep payment, balance, and lifecycle separate, and add the read/write models rather than faking a number.*
