# PR 3 — Playwright E2E for the Savings editor

| | |
| --- | --- |
| **Type** | New E2E test suite + seed scenarios |
| **Depends on** | PR 1 (controller split) and PR 2 (base-savings editor) — both must be in |
| **Risk** | Low — test code only, no production change |
| **Branch** | current branch — do not branch/worktree |

---

## 1. Why this PR exists

The Savings MVP is now reconciled end-to-end:

- Frontend MVP shipped in `3a9d16e6` (`docs/ai/savings-mvp-report.md`).
- Backend gap closed by PR 2 — `PATCH api/budgets/months/{ym}/base-savings`.

There is **no Playwright coverage** for the savings editor today. Component
unit tests cover individual pieces (`Frontend/src/Pages/private/savings/**/*.test.tsx`),
but no test drives the real `/dashboard/savings` surface against a real backend
and real DB. This PR closes that gap so the savings editor is regression-safe
before the next feature lands on top of it.

## 2. Read first

- `docs/ai/savings-mvp-report.md` — what the editor actually does and the
  contracts the FE relies on (especially §2 reconciliation, §3 live data, §6
  open questions).
- `Frontend/e2e/close-month/closed-month-recap-savings-debt.spec.ts` — the
  closest existing spec by domain; copy its structure (testid-anchored
  selectors, multi-locale text regexes, deterministic ordering assertions).
- `Frontend/e2e/smoke/dashboard-load.spec.ts` — the smoke-tag convention.
- `Backend.Tools/BudgetTimelineProfiles.cs` and `Program.cs` (the
  `EnsureUserAsync` block around line 161) — how a seeded scenario is wired.

## 3. Patterns to mirror

- **Selectors:** `page.getByTestId(...)` first; fall back to `getByRole(...)`
  with locale-tolerant regexes (Swedish / English / Estonian — see
  `closed-month-recap-savings-debt.spec.ts` for the `text = { ... }` style).
  Do **not** introduce text-only selectors that depend on one locale.
- **Login:** `await login(page, e2eUsers.<userKey>);` — the helper already
  handles the rate-limit failure mode.
- **No new test infrastructure.** Use `globalSetup`, `e2eUsers`, and the
  `seed-e2e` flow as they exist.
- **Tag the smoke spec with `@smoke`** in the test title so the `smoke` project
  picks it up; leave the deeper specs untagged so the `full` project runs them.

## 4. Test files to add

Place under `Frontend/e2e/savings/` (new folder, matches the `close-month/`
convention). Suggested split — one spec per surface so failures isolate cleanly:

| File | Coverage |
| --- | --- |
| `Frontend/e2e/smoke/savings-load.spec.ts` | `@smoke` — `/dashboard/savings` loads for a seeded user; hero, balance strip, goal cards, bassparande row and methods strip all render. |
| `Frontend/e2e/savings/savings-base-habit-edit.spec.ts` | Bassparande dialog — current-month edit, current+plan edit, orphan user has plan scopes **disabled**. |
| `Frontend/e2e/savings/savings-goal-lifecycle.spec.ts` | Create a goal via the draft card → it appears in goal cards → patch contribution via Justera mål dialog → complete it → it moves to Tidigare mål. |
| `Frontend/e2e/savings/savings-methods.spec.ts` | Add a method via the methods strip → it shows in the strip → remove it → it disappears. |
| `Frontend/e2e/savings/savings-balance-identity.spec.ts` | Six-term identity check — the displayed Kvar equals `income + carry − expenses − base − goals − debts` for the seeded month. |

> Keep each spec under ~120 lines. If a spec is growing, split it; do not
> bundle unrelated assertions into one test.

## 5. Selectors to use (already in the FE — do not invent new ones)

Confirmed `data-testid` values in `Frontend/src/Pages/private/savings/`:

- Hero / balance: `savings-plan-balance-strip`, `savings-plan-balance-headline`,
  `savings-plan-balance-chip`.
- Goal cards: `savings-goal-cards`, `savings-goal-cards-empty`,
  `savings-goal-add-placeholder`, `savings-goal-card`,
  `savings-progress-legend`.
- Goal draft: `savings-goal-draft-card`, `savings-draft-submit`,
  `savings-draft-error`.
- Goal dialog: `savings-goal-modal-snapshot`,
  `savings-goal-modal-target-date-caption`,
  `savings-goal-budget-warning`, `savings-goal-modal-scope-toggle`,
  `savings-goal-simulator-result`.
- Methods: `savings-methods-editor`, `savings-methods-suggestion`,
  `savings-methods-remove`, `savings-methods-editor-error`.
- Old goals: `savings-old-goals-section`, `savings-old-goals-toggle`,
  `savings-old-goals-count`, `savings-old-goals-list`,
  `savings-old-goal-row`, `savings-old-goal-status`.
- Bassparande dialog scopes:
  `savings-base-habit-scope-currentMonthOnly`,
  `savings-base-habit-scope-currentMonthAndBudgetPlan`,
  `savings-base-habit-scope-budgetPlanOnly`.

> If a spec needs a testid that does not yet exist on the page, **add it to
> the component** (one-line `data-testid` prop). Do not introduce fragile
> text-only selectors as a workaround. New testids should follow the existing
> `savings-*` convention.

## 6. Seed scenarios to add

Two new users — one "happy path" and one "orphan". Wire both through the
existing seeder (`Backend.Tools`).

### 6.1 `e2eSavingsEditor` — full-featured open month

Used by every spec except the orphan assertion. Open month
(`e2eOpenYearMonth` = `2026-04` per `helpers/e2eUsers.ts`), plan-linked
(`BudgetMonthSavings.SourceSavingsId IS NOT NULL`), with:

- A non-zero `Savings.MonthlySavings` (so the bassparande row has a real
  number to display and edit).
- 2–3 active savings goals with distinct `MonthlyContribution` values (so
  ordering and the "Justera mål" dialog have something to chew on).
- 1–2 plan-level savings methods (so the methods strip is not empty).
- Income, expenses, and debts populated so the six-term Kvar identity has
  every term to display.

### 6.2 `e2eSavingsOrphan` — month-only savings, no plan baseline

Used only by `savings-base-habit-edit.spec.ts`'s orphan assertion. Open
month where the materialized `BudgetMonthSavings.SourceSavingsId IS NULL`.
The FE response carries `IsMonthOnly = true`; the Bassparande dialog must
disable `currentMonthAndBudgetPlan` and `budgetPlanOnly`.

### 6.3 Seeder files to touch

- `Backend.Tools/BudgetTimelineProfiles.cs` — add two `BuildSavings*Profile`
  builders next to `BuildRecapSavingsDebtProfile`, mirroring its
  structure (oldest / middle / open scenarios + an invariant check
  appropriate to what each spec asserts).
- `Backend.Tools/BudgetTimelineScenarioData.cs` — extend the `Empty`
  scenario only if you need a new variant; otherwise compose with `with`
  expressions as `BuildRecapSavingsDebtProfile` does.
- `Backend.Tools/Program.cs` — register the two new users in the
  `EnsureUserAsync` block (mirror line 161-170 for each).
- `Frontend/e2e/helpers/e2eUsers.ts` — add `savingsEditor` and
  `savingsOrphan` keys with `@local.test` emails matching the seeder.

### 6.4 Invariant checks (mandatory)

For each new profile, add a post-seed invariant check the way
`BuildRecapSavingsDebtProfile` does at lines ~273-310 — assert active goal
count, savings total, etc. Invariant failures must throw so a broken seed
fails fast in `global-setup`, never silently in a spec.

For the orphan profile specifically, assert
`BudgetMonthSavings.SourceSavingsId IS NULL` for the open month — that is
the entire reason the user exists, and a regression here would silently
turn the orphan spec into a happy-path spec.

## 7. Test cases — specifics

### 7.1 `savings-load.spec.ts` (smoke)

```
test("seeded savings editor renders the MVP shell @smoke", ...)
```

- `login(page, e2eUsers.savingsEditor)`; navigate to `/dashboard/savings`.
- Hero, `savings-plan-balance-strip`, methods editor, and at least one
  `savings-goal-card` are visible.
- The Tidigare mål section and the forecast row exist but are not asserted
  in detail here — that is for other specs.

### 7.2 `savings-base-habit-edit.spec.ts`

- Open the bassparande dialog. The three scope toggles are present.
- Choose `currentMonthOnly`, enter a new amount, submit. Assert the row's
  displayed amount and the balance strip's bassparande term both update.
- Re-open the dialog, choose `currentMonthAndBudgetPlan`, change the amount,
  submit. Assert the same update — the plan write is asserted indirectly
  via the next-month materialization invariant (or via a second test using
  `e2eUsers.savingsEditor` after reload, since the FE response carries the
  persisted value).
- Login as `e2eUsers.savingsOrphan`, open the dialog. Assert
  `currentMonthAndBudgetPlan` and `budgetPlanOnly` are **disabled** (use
  `await expect(scopeButton).toBeDisabled()`); `currentMonthOnly` is
  enabled and a current-month write succeeds.

### 7.3 `savings-goal-lifecycle.spec.ts`

- Click `savings-goal-add-placeholder` → `savings-goal-draft-card` opens.
- Fill name + target + monthly contribution; submit; assert the new card
  appears in `savings-goal-cards` and the hero `goals` subtitle increased.
- Open the Justera mål dialog for the new goal, change
  `monthlyContribution`, submit; assert the card and the balance strip's
  målsparande term both update.
- Complete the goal via the dialog's complete action; assert the card
  disappears from active and is visible after toggling
  `savings-old-goals-toggle`, with `savings-old-goal-status` showing
  completed.

### 7.4 `savings-methods.spec.ts`

- Add a suggested method via `savings-methods-suggestion`; assert it
  renders in the strip.
- Remove it via `savings-methods-remove`; assert it disappears.

### 7.5 `savings-balance-identity.spec.ts`

- Read each numeric term from the balance strip via its testid.
- Assert `kvar == income + carry − expenses − base − goals − debts`
  exactly (decimal compare with a 1-öre tolerance; use `Number.parseFloat`
  on the displayed value after stripping the currency suffix).
- This is the regression guard for FE report §6 Q3.

## 8. Hard constraints

- No production-code changes beyond **adding** `data-testid` props if a
  selector is missing. Do not refactor, restyle, or "improve" the savings
  components while you are in there.
- No new test runners, no new helper frameworks. Use `@playwright/test`,
  the existing `login` helper, and the existing `e2eUsers` map.
- Multi-locale text regexes only — match Swedish / English / Estonian
  exactly as existing specs do. The seed locale is not pinned.
- Do **not** mock the API in E2E. The whole point of this PR is to drive
  the real backend.
- Do not touch auth, Docker, Caddy, or CI.

## 9. Validation

```
# DB up (from repo root)
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db

# Smoke pass — fast, gates PR
cd Frontend && npm run test:e2e:smoke

# Full pass — the new savings/ folder runs under the `full` project
cd Frontend && npm run test:e2e:full
```

Re-running the seeder is automatic via `globalSetup`. If a spec fails on
ordering or money values, the seed invariant from §6.4 likely needs to be
strengthened — fix the seed, not the spec.

## 10. Acceptance criteria

- Five new spec files exist under `Frontend/e2e/` per §4.
- Two new seeded users exist and are referenced from
  `Frontend/e2e/helpers/e2eUsers.ts`.
- The orphan seed asserts `BudgetMonthSavings.SourceSavingsId IS NULL`
  for the open month.
- `npm run test:e2e:smoke` passes (includes the new savings smoke).
- `npm run test:e2e:full` passes (includes the four full savings specs).
- The six-term Kvar identity holds in `savings-balance-identity.spec.ts`.
- No production component logic changed; any added `data-testid` props
  are listed in the PR description.

## 11. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, validation results).
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `test(savings): cover the savings editor end-to-end`.
3. Stop. Do not commit or push.
