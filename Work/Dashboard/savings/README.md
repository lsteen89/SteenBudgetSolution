# Work — Dashboard / Savings

Backend work queue for the **Savings MVP**. The frontend MVP shipped in commit
`3a9d16e6`; this folder breaks the remaining **backend** work into discrete,
agent-actionable PRs.

## How to use this folder

Each `PR-NN-*.md` file is a **self-contained brief for one coding agent**. An
agent should be able to open a single file and implement the PR without needing
this README or any other PR file. Implement PRs in numeric order — later PRs
assume earlier ones have landed.

## Source material

- `docs/ai/savings-mvp-report.md` — the frontend MVP report (what was built,
  what is a placeholder, open questions). **Read this first** for any savings PR.
- `docs/ai/savings-mvp-backend-plan.md` — the high-level backend breakdown this
  folder is derived from.

## Background — what already exists (do not rebuild)

The savings editor backend is **mostly built**. Verified in the repo:

- Savings **goals**: create / patch / bulk-patch / complete / cancel / remove —
  all live (`Backend/Application/Features/Budgets/Months/Editor/Savings/`).
- Savings **methods**: get / add / remove — shipped in commit `3a9d16e6`, FE
  already calls them.
- Savings **archive** ("Tidigare mål") — live.

The **only real backend gap** from the FE report is the **Bassparande (base
monthly savings) editor** — there is no command to write base savings. Forecast
and the contribution simulator are frontend-only and need no backend.

## Data model (verified)

- `Savings` — one row per budget: `Id`, `BudgetId`, `MonthlySavings DECIMAL(18,2)`.
- `BudgetMonthSavings` — per-month materialization: `Id`, `BudgetMonthId`,
  `SourceSavingsId` **(nullable FK → `Savings.Id`)**, `MonthlySavings`,
  `IsOverride`, `IsDeleted`, audit columns.
- The dashboard's `savings.monthlySavings` / `totalSavingsMonthly` is read
  straight from `BudgetMonthSavings.MonthlySavings`.

## PR queue

| PR | File | Title | Depends on | Status |
| --- | --- | --- | --- | --- |
| 1 | `PR-01-controller-split.md` | Split `BudgetController.Editor.cs` by domain | — | Implemented (uncommitted) |
| 2 | `PR-02-base-savings-editor.md` | Bassparande base-savings editor slice (backend) | PR 1 | Implemented (uncommitted) |
| 2.5 | `PR-2.5-wire-base-savings-fe.md` | Wire the Bassparande editor (frontend) | PR 2 | Not started |
| 2.6 | `PR-2.6-expose-is-month-only-on-dashboard.md` | Expose `isMonthOnly` on the savings dashboard read | PR 2 | Not started |
| 2.7 | `PR-2.7-balance-strip-term-testids.md` | Per-term testids on `SavingsPlanBalanceStrip` | — | Not started |
| 2.8 | `PR-2.8-fix-savings-bugs.md` | Fix two pre-existing savings bugs (FE typo + BE off-by-one) | PR 2.6 | Implemented (uncommitted) |
| 2.9 | `PR-2.9-base-habit-dialog-orphan-unit-test.md` | Unit test: Bassparande dialog disables plan-scope cards on orphan | PR 2.8 | Not started |
| 3 | `PR-03-savings-e2e.md` | Playwright E2E for the savings editor | PR 2.5 + PR 2.7 + PR 2.8 | Mostly green — 17/19, last 2 blocked on PR 2.8 |
| 4 | `PR-04-savings-math-contract-tests.md` | Savings-math contract tests (BE lock + cross-page E2E parity) | the goals-included supersede commit | Not started |
| — | `V2-CLEANUP-AUDIT.md` | Current-state inventory & V2 cleanup plan (read alongside the overview) | — | Plan |
| — | `PR-V2-OVERVIEW.md` | Savings V2 — goal-card refactor (overview + sequencing) | — | Plan |
| 5 | `PR-05-be-rename-goal.md` | Rename savings goal — backend slice | PR 1 | Plan |
| 6 | `PR-06-be-change-goal-target-amount.md` | Change savings-goal target amount — backend slice | PR 1 | Plan |
| 7 | `PR-07-be-goal-one-time-transfer.md` | Savings-goal one-time transfer (deposit/withdraw) — backend slice | PR 1 | Plan |
| 8 | `PR-08-fe-goal-card-action-chips.md` | Goal card → V2 action chips + focused Månadsbelopp / Måldatum modals (FE) | — | Plan |
| 9 | `PR-09-fe-one-time-transfer-modal.md` | Engångsöverföring modal (FE) | PR 7 + PR 8 | Plan |
| 10 | `PR-10-fe-kebab-rename-target-amount.md` | Kebab: Byt namn + Ändra målbelopp focused modals (FE) | PR 5 + PR 6 + PR 8 | Plan |

See `SAVINGS-WIRING-AUDIT.md` for why PRs 2.5 / 2.6 / 2.7 were inserted.
See `SAVINGS-BUGS-INVESTIGATION.md` for why PR 2.8 was added.
PR 4 was added after the April 2026 `+950 / −3 050` contradiction
surfaced — see the 2026-05-24 supersede entry in
`docs/ai/ai-changelog.md`.

PRs 5–10 follow from the V2 goal-card design in
`explorations/savings/MVP-Savings v2.html` (Anthropic Design handoff
bundle `yzOgWtytYMM0ps5cvK5Q5w`). Read `PR-V2-OVERVIEW.md` first — it
covers the BE gap analysis, the rationale for splitting the existing
`SavingsGoalContributionModal` into focused per-action modals, and the
build order. An E2E PR (PR-11) will be drafted once PR-08 / 09 / 10 land
in the working tree.

Deferred (no PR — recorded decisions):

- **Forecast** (`savings-mvp-report.md` §4.2) — keep the frontend straight-line
  projection for the MVP. A backend forecast endpoint is optional future work.
- **Contribution simulator** (§4.3) — pure frontend calculator, never persists.

## Repo rules every PR agent must follow

From `CLAUDE.md` / `.agents/instructions/backend.instructions.md`:

- Work on the current branch. Do **not** create a worktree.
- Diagnose before changing; match the nearest existing feature slice.
- `decimal` for money. Dapper only, parameterized SQL, explicit columns.
- Do **not** touch auth, security, Docker, Caddy, CI/CD, or env/secret config.
- After completing the task: append an entry to `docs/ai/ai-changelog.md`,
  write the commit message to `COMMIT_MSG.tmp`, then **stop** — do not commit
  or push unless the user explicitly says so.
