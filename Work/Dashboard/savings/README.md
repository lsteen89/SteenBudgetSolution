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
| 1 | `PR-01-controller-split.md` | Split `BudgetController.Editor.cs` by domain | — | Not started |
| 2 | `PR-02-base-savings-editor.md` | Bassparande base-savings editor slice | PR 1 | Not started |

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
