# Savings MVP — backend PR breakdown

**Date:** 2026-05-22
**Branch context:** `feature/PolishDashboardEditor`
**Source docs:** `docs/ai/savings-mvp-report.md` (FE MVP report), commit `3a9d16e6`
**Goal:** turn the FE placeholders from the Savings MVP into real backend
behaviour, and tidy the controller layout while we are in here.

This is a planning document. No code has been changed. Each PR below is sized
to be reviewed on its own and lists exactly what already exists vs. what is new.

---

## What already exists (verified in repo)

The savings editor backend is **mostly built**. The latest commit (`3a9d16e6`)
shipped the savings-methods write slice; the FE methods add/remove already call
live endpoints.

Existing savings endpoints (`BudgetController.Editor.cs`):

- `GET    months/{ym}/savings-goals` / `/old`
- `POST   months/{ym}/savings-goals`
- `PATCH  months/{ym}/savings-goals/{id}` + bulk `PATCH .../savings-goals`
- `POST   months/{ym}/savings-goals/{id}/complete | cancel | remove`
- `GET    months/{ym}/savings-methods`
- `POST   months/{ym}/savings-methods` + `DELETE .../{id}`

Existing slices to mirror (feature-slice pattern is consistent):

- `Editor/Savings/PatchSavingsGoal/` — command + validator + handler +
  `SavingsGoalMutationApplier` (scope handling, audit, baseline cascade).
- `Editor/Income/PatchIncomeItem/` — single scalar amount + 3-scope edit, the
  closest analogue to the base-savings editor.

Data model (confirmed):

- `Savings` (one row per budget): `Id`, `BudgetId`, `MonthlySavings DECIMAL(18,2)`.
- `BudgetMonthSavings` (per-month materialization): `Id`, `BudgetMonthId`,
  `SourceSavingsId` **(nullable FK → `Savings.Id`)**, `MonthlySavings`,
  `IsOverride`, `IsDeleted`, audit columns.
- The dashboard's `savings.totalSavingsMonthly` / `monthlySavings` is read
  directly from `BudgetMonthSavings.MonthlySavings`
  (`BudgetMonthDashboardRepository.sql.cs`).

**The only real backend gap** flagged by the FE report is the **Bassparande
editor** (§4.1) — there is no command to edit base monthly savings. Forecast
(§4.2) and the contribution simulator (§4.3) are FE-only and need no backend.

---

## PR 1 — Controller refactor: split `BudgetController.Editor.cs` by domain

**Type:** pure file move, zero behaviour change. **Do this first.**

`BudgetController.Editor.cs` is 681 lines mixing four domains. Split it into
partial files of the *same* `BudgetController` class (same `[Route("api/budgets")]`,
same `[Authorize]`, same action signatures — nothing functional changes):

| New file | Contents moved out of `Editor.cs` |
| --- | --- |
| `BudgetController.Editor.cs` | keep only `GetMonthEditor` (the umbrella query) |
| `BudgetController.Editor.Expenses.cs` | expense create / patch / bulk-patch / delete |
| `BudgetController.Editor.Income.cs` | income get / create / patch / bulk-patch / delete |
| `BudgetController.Editor.Savings.cs` | savings goals + methods endpoints |
| `BudgetController.Editor.Debts.cs` | debt get / patch / bulk-patch |

Each file declares `public sealed partial class BudgetController` and carries
**only its own `using`s**. The other partials (`Dashboard`, `MonthLifecycle`,
`MonthRecap`, `ExpenseCategories`, `cs`) are already domain-scoped — leave them.

- **Risk:** trivial. No route, DI, or policy change.
- **Validation:** `dotnet build`; optionally hit the existing editor smoke E2E.
- **Why first:** PR 2 adds a savings endpoint — landing it into a clean
  `Editor.Savings.cs` avoids a second churn of the 681-line file.

> Decision taken: partial files of one class (not separate controller classes).
> Separate classes would force re-declaring route prefix + `EmailConfirmed`
> policy per controller for no functional gain.

---

## PR 2 — Bassparande editor: edit base monthly savings (the real gap)

**Type:** new feature slice. This flips FE §4.1 from placeholder to live.

Today `SavingsBaseHabitDialog` logs its payload and stores a session-local
`baseMonthlyOverride`. It needs a command to persist
`BudgetMonthSavings.MonthlySavings` / `Savings.MonthlySavings` with the three
standard scopes — mirroring `PatchSavingsGoal` and `PatchIncomeItem`.

**New files (mirror `Editor/Savings/PatchSavingsGoal/`):**

- `DTO/.../Editor/Savings/PatchBudgetMonthBaseSavingsRequestDto.cs`
  — `{ AmountMonthly: decimal, Scope: string }`.
- `Editor/Savings/PatchBaseSavings/PatchBudgetMonthBaseSavingsCommand.cs`
  — `(Persoid, YearMonth, AmountMonthly, Scope)`, `: ITransactionalCommand`.
- `.../PatchBudgetMonthBaseSavingsCommandValidator.cs`
  — `AmountMonthly >= 0`, `PrecisionScale(12,2)`, `YearMonth` regex,
  `Scope` ∈ the 3 supported scopes.
- `.../PatchBudgetMonthBaseSavingsCommandHandler.cs`
  — `EnsureAccessibleMonthAsync` → month-open check → load `BudgetMonthSavings`
  for the month → apply (see scope table) → emit a `BudgetMonthChangeEvent`.

**Repository additions** (extend `IBudgetMonthSavingsGoalMutationRepository`
or a sibling `IBudgetMonthSavingsMutationRepository` — pick per reviewer):

- `GetBudgetMonthSavingsForBaseEditAsync(budgetMonthId)` → `{ Id,
  SourceSavingsId, MonthlySavings, IsOverride }`.
- `UpdateMonthBaseSavingsAsync` → `UPDATE BudgetMonthSavings SET MonthlySavings,
  IsOverride = 1, UpdatedAt, UpdatedByUserId WHERE Id = @Id`.
- `UpdateBaselineBaseSavingsAsync` → `UPDATE Savings SET MonthlySavings,
  UpdatedAt, UpdatedByUserId WHERE Id = @SavingsId`.

**Scope semantics** (mirror `SavingsGoalMutationApplier`):

| Scope | `BudgetMonthSavings.MonthlySavings` | `Savings.MonthlySavings` |
| --- | --- | --- |
| `currentMonthOnly` | write (`IsOverride=1`) | — |
| `currentMonthAndBudgetPlan` | write (`IsOverride=1`) | write |
| `budgetPlanOnly` | — | write |

**Orphan rule (FE report §4.1 / §6 Q1):** when `BudgetMonthSavings.SourceSavingsId
IS NULL`, the two plan-writing scopes must be **rejected** with a clear error —
do **not** silently create a `Savings` baseline. Mirror how `CreateSavingsGoal`
rejects `SourceSavingsId is null` with `SavingsPlanMissing`. Add a dedicated
error (e.g. `BaseSavings.PlanMissing`) in a new
`Errors/Budget/Errors.BaseSavingsErrors.cs` or reuse the savings-goal error.

**Endpoint** (lands in the new `BudgetController.Editor.Savings.cs` from PR 1):

- `PATCH months/{yearMonth}/base-savings` → `ApiEnvelope<...>`. Return shape:
  the saved `monthlyAmount` plus a `canEditPlan` / `isMonthOnly` flag so the FE
  dialog can gate scopes (see "Contract" below).

**No-op / idempotency:** treat a numerically-equal amount as a no-op and skip
the audit row, exactly as `SavingsGoalMutationApplier` does for contribution.

**No cascade to other open months.** Goal *contribution* patches do not cascade
(only target-date does); base savings follows the same rule — future months
pick up the new baseline at materialization. *Confirm with reviewer.*

**Contract item — expose plan-link state.** The FE needs to know
`SourceSavingsId IS NULL` to disable the plan scopes (FE report §6 "the
frontend does not yet detect that orphan state"). Cheapest path: include
`isMonthOnly` (or `canEditPlan`) on the PATCH response **and** on whatever
read the dialog opens from. Verify whether `BudgetMonthEditorDto` /
`BudgetDashboardMonthDto` already carries a savings section that can hold this
flag; if not, add it to the dashboard `SavingsOverviewDto`. *Small, confirm
placement with reviewer.*

**Tests:** integration `Backend.Tests/.../Editor/BaseSavingsWriteTests.cs`
mirroring `SavingsMethodWriteTests.cs` — one case per scope, the orphan
rejection, month-closed rejection, no-op idempotency.

**Pre-flight verification (FE report §6 Q2 & Q3) — do inside this PR, no
separate PR if nothing is wrong:**

- Q2: confirm `dashboard.savings.monthlySavings` and `.totalSavingsMonthly` are
  the same base figure. (`SavingsOverviewDto` comment already says they are
  equal — confirm the projector populates both from
  `BudgetMonthSavings.MonthlySavings`.)
- Q3: confirm the dashboard `finalBalanceWithCarry` omits *only* goal
  contributions, so the FE six-term strip cannot disagree with the dashboard.
  If it omits anything else, raise it before the strip ships.

---

## Deferred / no backend work

- **Forecast row (FE report §4.2).** Recommendation: **keep the FE straight-line
  projection for the MVP.** Low urgency, the row hides itself when there is no
  positive plan. A real `GET months/{ym}/savings/forecast` query (accounting for
  goals hitting targets and dropping out) can be a later PR if the product wants
  it. No PR now — just record the decision.
- **Contribution simulator (FE report §4.3).** Pure FE calculator, never saves.
  No backend work unless "apply this one-off transfer" becomes a real action.

---

## Suggested order & follow-up

1. **PR 1** — controller split (fast, unblocks a clean home for PR 2).
2. **PR 2** — Bassparande editor (the actual MVP gap).
3. **FE follow-up (separate, not a backend PR):** swap the
   `SavingsBaseHabitDialog` placeholder + `baseMonthlyOverride` session state
   for a real `usePatchBudgetMonthBaseSavings` mutation, and use the
   `isMonthOnly` flag to disable plan scopes.
4. Forecast endpoint — only if the product asks for it.

Open decisions for the reviewer, surfaced by PR 2:

- New repo interface vs. extending `IBudgetMonthSavingsGoalMutationRepository`.
- Where the `isMonthOnly` flag lives (editor DTO vs. dashboard `SavingsOverviewDto`).
- Confirm "no cascade to other open months" for base-savings plan writes.
