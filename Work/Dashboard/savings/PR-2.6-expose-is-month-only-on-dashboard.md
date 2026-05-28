# PR 2.6 — Expose `isMonthOnly` on the savings dashboard read

| | |
| --- | --- |
| **Type** | Small BE + FE — extend an existing read DTO with one boolean |
| **Depends on** | PR 1 + PR 2. Pairs with PR 2.5 (can land before, after, or folded into it) |
| **Blocks** | Nothing strictly — PR 3 can survive without this, but PR 2.5's "first open" orphan UX is ugly without it |
| **Risk** | Low — additive field on a read DTO, no write paths touched |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

`SAVINGS-WIRING-AUDIT.md` §2 (Major #1) and §6 flag a gap: the FE Bassparande
dialog needs to know `IsMonthOnly` (i.e. whether
`BudgetMonthSavings.SourceSavingsId IS NULL` for the open month) **before the
first save** so it can disable the plan-scope cards on first open. Today the
BE only returns it on the `PATCH` response.

The cheapest fix is to add `isMonthOnly` to the savings overview that the
dashboard month query already exposes. The dashboard becomes the single
source of truth for read state; the dialog props in PR 2.5 stop needing the
"learn on first save" workaround.

## 2. Read first

- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** — especially §2
  (Major #1) and §3 (the `PATCH base-savings` row noting the BE-only
  exposure), §6 (this PR's place in the sequence).
- **`Work/Dashboard/savings/PR-02-base-savings-editor.md`** — §5 (the orphan
  rule the FE wants to mirror) and §10 (the existing `SavingsOverviewDto`
  comments about base figure equality).
- **`docs/ai/ai-changelog.md`** — recent entries for what PR 1 + PR 2 +
  PR 2.5 actually shipped.
- The committed-but-unpushed BE for the source of truth on the existing
  savings projector: search for `SavingsOverviewDto` and the dashboard month
  projector that populates it (likely under
  `Backend/Application/Features/Budgets/Months/Dashboard/` or the
  infrastructure-side `BudgetMonthDashboardRepository`).

## 3. What to change

### 3.1 BE — read DTO + projector

1. Add `IsMonthOnly: bool` to `SavingsOverviewDto` (or whichever record the
   dashboard month projector returns for the savings block — confirm by
   inspecting the existing comments and call sites). Place it next to
   `MonthlySavings` / `TotalSavingsMonthly` so the FE sees the relationship.
2. In the projector / repository SQL that builds that DTO, populate it from
   `BudgetMonthSavings.SourceSavingsId IS NULL`. Match the existing query
   style — explicit columns, parameterised, Dapper. If the savings overview
   is built from a sub-query / join already, add the column there; do not
   add a separate round-trip.
3. If a unit/integration test currently asserts the shape of
   `SavingsOverviewDto`, extend it to cover both `IsMonthOnly = true` (orphan
   seed) and `IsMonthOnly = false` (plan-linked seed).

> **Source of truth check:** confirm that the projector reads from
> `BudgetMonthSavings`, not from `Savings`. Audit §3 already verified the
> dashboard's `monthlySavings` reads `BudgetMonthSavings.MonthlySavings`;
> `IsMonthOnly` must come from the same row to stay consistent.

### 3.2 FE — type + thread through

1. Add `isMonthOnly: boolean` to the FE mirror of `SavingsOverviewDto` in
   `Frontend/src/types/budget/BudgetDashboardMonthDto.ts` (or wherever the
   savings overview type lives — match the file the BE response unmarshals
   into).
2. In `SavingsEditorPage.tsx`, source the prop from the dashboard month
   query result and pass it to `SavingsBaseHabitDialog`. Remove the
   "learn on first save" workaround PR 2.5 had to leave behind.
3. After a successful `PATCH base-savings`, the dashboard invalidation
   (already wired in PR 2.5) re-fetches the overview and refreshes
   `isMonthOnly` automatically — no extra plumbing needed.

## 4. What NOT to do

- Do **not** add a new read endpoint (`GET months/{ym}/base-savings`). The
  whole point is to keep the dashboard as the single source of truth.
- Do **not** add `IsMonthOnly` anywhere else (recap DTO, snapshot,
  per-goal row) — its only consumer is the bassparande dialog.
- Do **not** change `MonthlySavings` / `TotalSavingsMonthly` semantics. PR 2
  §10 verified they agree; leave them alone.
- Do **not** touch goals, methods, archive, auth, Docker, Caddy, or CI.

## 5. Acceptance criteria

- `SavingsOverviewDto` (BE) carries `IsMonthOnly: bool`, populated from
  `BudgetMonthSavings.SourceSavingsId IS NULL`.
- The FE dashboard type carries the matching `isMonthOnly` field.
- `SavingsBaseHabitDialog` receives `isMonthOnly` from the dashboard query,
  not from local "remember the last patch response" state.
- For an orphan month, the dialog renders plan-scope cards as **disabled**
  on first open — no save needed to learn the orphan status.
- `dotnet build` and `npm run build` succeed. Existing savings overview
  tests pass; new assertions on `IsMonthOnly` pass for both orphan and
  plan-linked seeds.

## 6. Validation

```
cd Backend && dotnet build
cd Backend && dotnet test --filter FullyQualifiedName~SavingsOverview
cd Frontend && npm run build
```

Manual: navigate to `/dashboard/savings` for a seeded orphan user — open the
Bassparande dialog without saving anything first → plan-scope cards are
disabled.

## 7. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md`.
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `feat(savings): expose isMonthOnly on savings dashboard overview`.
3. Stop. Do not commit or push.
