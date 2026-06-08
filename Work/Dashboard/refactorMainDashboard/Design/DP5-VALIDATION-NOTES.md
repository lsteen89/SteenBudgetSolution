# DP5 — Validation Notes (Playwright visual + E2E regression)

**Date:** 2026-06-08
**Slice:** DP5 (final slice of the dashboard visual-polish pass)
**Scope:** tests only — no component changes.

## What was added

Two Playwright specs covering the polished open-month dashboard:

- `Frontend/e2e/smoke/dashboard-polish.spec.ts` (`smoke` project, `@smoke`)
  - **Polished surface renders:** MoneyState hero + tone word (DP3), AllocationBar
    legend with expenses/savings/debts entries (DP2), four pillar cards with the
    savings-goals and debts per-item lists (DP1).
  - **Single-read + lazy drawer:** asserts no editor/detail endpoint
    (`income-items`, `expense-items`, `savings-goals`, `savings-methods`,
    `debt-items`, `debt-editor`, `months/{ym}/editor`, `expense-categories`) is
    fetched on initial dashboard load; then opening the Expenses quick-adjust
    drawer lazily fires the `GET /months/{ym}/editor` read.

- `Frontend/e2e/dashboard/dashboard-polish-states.spec.ts` (`full` project)
  - open-normal (desktop) — hero anchor + allocation bar + four pillars; desktop
    screenshot.
  - deficit — `data-tone="negative"`, minus-signed anchor, runs-out marker +
    unfunded tail attached; desktop + mobile screenshots.
  - zero remaining — `data-tone="zero"`, no `free` legend/bar segment.
  - open close-window — CloseBand visible with `data-kind` ∈ {eligible, overdue}
    (the seeded state is time-relative, see below), CTA + carry-forward preview,
    MonthRail close CTA; desktop close-band screenshot.
  - overdue-specific danger band — explicit `test.fixme` placeholder (visible
    pending test, not a tolerant matcher pretending coverage); see residual gaps.
  - closed read-only — recap visible, zero open-month surfaces (no MoneyState,
    pillar workbench, attention lane, close band, close CTA).
  - skipped read-only — skipped state visible, zero open-month surfaces.
  - mobile single-column — open-normal + deficit render; screenshots captured.

  Screenshot coverage: desktop {open-normal, deficit, close-band} and mobile
  {open-normal, deficit}.

Seeded users used (Backend.Tools `seed-e2e`): `closeSurplusFull` (+1250, eligible,
with a closed + skipped month behind it), `closeDeficit` (-750),
`closeModalBalanced` (0). All asserted test-ids and seeded states were verified
against the live component source and the seeder, not assumed.

## What was run

- `npx playwright test --list` — both specs parse and resolve to the correct
  projects: **2 tests in `smoke`, 9 in `full`** (11 total; 1 of the `full`
  entries is the `test.fixme` overdue placeholder, so 10 are runnable).
- `tsc --noEmit` over both specs — no type errors.

## What was NOT run (and why)

**Live Playwright execution is deferred / unverified.** The e2e harness requires:

- the **e2e** MariaDB on port 3307 (only the dev DB on 3306 was up),
- a running backend on 5001 (was down),
- `dotnet run --project Backend.Tools -- seed-e2e` with `.env.e2e` secrets
  (`MARIADB_ROOT_PASSWORD`, `MARIADB_PASSWORD`, …).

Standing up backend + e2e DB + seeding is infrastructure work outside this
slice's remit (and CLAUDE.md forbids touching Docker/infra without instruction).
The specs should be run in CI or locally once the e2e stack is up:

```
cd Frontend
npm run test:e2e:smoke     # the two DP5 smoke tests + existing smoke
npm run test:e2e           # full, incl. the DP5 state matrix
```

## Residual scenario gaps (no seeded fixture exists)

The DP5 handover lists these states; there is no seeded user/state that produces
them deterministically today, so they are intentionally **not** asserted as
green rather than faked:

> **Update (2026-06-08, resolved):** the deficit/zero specs failed because they
> reused `closeDeficit` / `closeModalBalanced`, which other specs **close**
> (`close-month-modal-balanced`, `closed-month-recap-hardening`) — on the shared
> e2e DB, that rolls those users' open month forward to a positive template. Fix:
> two dedicated, never-mutated seed users `dashboardDeficit` (−750) /
> `dashboardZero` (0); the `deficit`, `zero`, and `mobile deficit` specs now use
> them and are active (no longer `fixme`). The clock pin attempt was reverted
> (it broke 5 suites). Only the overdue gap below remains.

- **Overdue close band** — no dedicated aged-close-window user. `closeSurplusFull`
  is `eligible` while inside the window and ages to `overdue` only relative to
  wall-clock "now", so it cannot deterministically pin `data-kind="overdue"`.
  This is now an explicit `test.fixme` in `dashboard-polish-states.spec.ts`
  (shows as a pending test in the runner) rather than a tolerant
  `/eligible|overdue/` matcher implying coverage. Closing it needs a seed profile
  with a back-dated close window.
- **Upcoming close band** (`data-kind="upcoming"`) — no seeded future-window user.
- **No-savings pillar empty state** — the baseline budget always seeds base
  savings + one goal.
- **No-debts pillar empty state** — the baseline budget always seeds two debts.

Closing these would need either new seed profiles (zero-savings / zero-debts /
aged-or-future close window) or component-level coverage. They are already
covered at the unit/component layer by the existing `*.test.tsx` suites
(empty-state branches, CloseBand `upcoming`/`overdue` resolution), so this is a
gap in *e2e* breadth only, not in behaviour coverage.
