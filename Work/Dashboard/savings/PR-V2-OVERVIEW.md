# Savings V2 — Goal-card refactor (overview)

| | |
| --- | --- |
| **Source design** | `explorations/savings/MVP-Savings v2.html` from the eBudget design handoff bundle (Anthropic Design `yzOgWtytYMM0ps5cvK5Q5w`). |
| **Branch** | `feature/PolishDashboardEditor` (current). Do not branch or worktree. |
| **Predecessor** | Savings MVP shipped commits up to `bd81c6ec`. The MVP page is live; this overview tracks the V2 refactor of the **goals area only** (cards, per-goal modals, kebab actions). |
| **Scope owner** | This file. Each `PR-NN-*.md` below is self-contained for an agent. |

---

## 1. What V2 changes (intent)

V2 keeps the hero / methods strip / bassparande row / balance strip /
forecast row / "tidigare mål" section as-is. The redesign is concentrated
on **how a user edits one savings goal**:

- Replace the single **"Justera"** button on each `SavingsGoalCard` with an
  explicit action row:
  - **Sätt in** (primary, deposit chip) — opens **Engångsöverföring**.
  - **Månadsbelopp** — opens **Ändra månadsbelopp** modal.
  - **Måldatum** — opens **Ändra måldatum** modal.
  - **⋯ kebab** — Byt namn / Ändra målbelopp / Arkivera mål / Ta bort mål.
- The single `SavingsGoalContributionModal` is replaced by **focused
  modals**, one per backend endpoint. The V2 design's stated principle:
  *one modal = one mutation*. Each modal carries a "goal snapshot" header
  (saved / target / deadline), a big numeric input where applicable, a
  scope or mode strip, and an outcome preview line.
- The progress bar gains a **planned-vs-actual marker** (already present in
  `SavingsGoalCard.tsx`'s `ProgressTrail` — preserved).
- The **Bassparande row** also gains a primary **"Sätt in extra"** chip
  that reuses the same Engångsöverföring modal in a *habit/buffer* mode
  (note: backend support deferred — see §3 below).

See `docs/ai/savings-mvp-report.md` and the V2 HTML for visual reference.

## 2. Backend gap analysis (verified today)

Today's BE has these savings-goal slices:

| Operation | Slice |
| --- | --- |
| Update monthly contribution + scope | `PatchSavingsGoal` (`PATCH …/savings-goals/{id}`) |
| Update target date (gated to `currentMonthAndBudgetPlan`) | `PatchSavingsGoal` (same endpoint, `targetDate` field) |
| Complete / Cancel / Remove | `Lifecycle/*` (`POST …/complete | …/cancel | DELETE …`) |
| Bulk patch monthly contributions | `PatchSavingsGoalsBulk` |
| Create | `CreateSavingsGoal` |
| Base savings (Bassparande) | `PatchBaseSavings` |

The V2 design adds three goal-level operations with **no current BE
endpoint**:

1. **One-time transfer (Sätt in / Ta ut)** — mutates `SavingsGoal.AmountSaved`
   and the projected `BudgetMonthSavingsGoal.AmountSaved` snapshot. Today
   `AmountSaved` only advances at goal creation and at month-close
   accumulation (see `BudgetMonthSavingsGoalMutationRepository.Sql.cs:237–263`).
   A mid-month deposit or withdrawal has no path. **Needed for PR-09.**
2. **Rename goal** — `Name` is set at creation and never edited. **Needed
   for PR-10.**
3. **Change target amount** — `TargetAmount` is set at creation and never
   edited. **Needed for PR-10.**

All three become new feature slices, modelled on `PatchSavingsGoal`. The
existing `PatchSavingsGoal` is left untouched (V2 keeps the
"one endpoint per modal" contract).

### What we are NOT building in V2

- **Habit/buffer one-time transfer.** V2 wires the bassparande "Sätt in
  extra" chip to the same Engångsöverföring modal in a *buffer* mode. Our
  data model has no "buffer balance" — `Savings.MonthlySavings` is a
  monthly outflow, not a running balance. PR-09 covers goals only; the
  habit chip will open the modal in a disabled "Coming soon" state until a
  buffer concept is designed. Flagged inline in PR-09.
- **Forecast endpoint.** V2 keeps the existing FE straight-line projection
  (`SavingsForecastRow`). Decision recorded in README.md (Deferred).
- **Contribution simulator** in the goal modal. V2 drops the simulator —
  the focused modals each carry a single-purpose outcome line instead.
  PR-08 removes the simulator block from the FE.

## 3. PR sequence

Build order is BE → FE so each FE PR can wire against a real endpoint.

| PR | Side | Title | Depends on |
| --- | --- | --- | --- |
| 05 | BE | Rename savings goal slice | — |
| 06 | BE | Change savings-goal target amount slice | — |
| 07 | BE | Savings-goal one-time transfer (deposit/withdraw) slice | — |
| 08 | FE | Goal card → action chips + focused Månadsbelopp + Måldatum modals (uses already-shipped `PatchSavingsGoal`) | — (but lands cleanest after the goal-card UI ships) |
| 09 | FE | Engångsöverföring modal (deposit/withdraw) | PR-07, PR-08 |
| 10 | FE | Kebab → Rename + Change target-amount focused modals | PR-05, PR-06, PR-08 |

PRs 05 / 06 / 07 are **independent** and may be implemented in parallel by
three different agents — each one is one slice, one endpoint, one
controller route, with its own integration test.

PR-08 has no BE dependency and can land in parallel with the BE PRs; it
removes `SavingsGoalContributionModal`, replaces it with the two focused
modals that the already-shipped `PatchSavingsGoal` endpoint covers, and
leaves the **Sätt in / Byt namn / Ändra målbelopp** chips & kebab items
visible but disabled (with a small "Snart" hint), to be enabled by PR-09
and PR-10. This keeps every PR small and reviewable.

PR-11 (Playwright E2E for the new chips and three new modals) will be
brief-authored once PR-08, 09, 10 are in the working tree — pattern
follows `PR-03-savings-e2e.md`.

## 4. Architectural ground rules (for every V2 PR)

These restate the canonical rules from
`.agents/instructions/backend.instructions.md` and
`.agents/instructions/frontend-ui.instructions.md`. Each PR brief assumes
them and does not repeat them.

- **One feature slice = one folder.** New BE slices live under
  `Backend/Application/Features/Budgets/Months/Editor/Savings/<SliceName>/`
  with `Command.cs`, `CommandHandler.cs`, `CommandValidator.cs`, and a
  request DTO under `Backend/Application/DTO/Budget/Months/Editor/Savings/`.
- **Mirror the nearest sibling.** `PatchSavingsGoal` is the canonical
  template — it covers permission checks (`EnsureAccessibleMonthAsync`),
  status gates (`BudgetMonthStatuses.Open`), audit (`changeEvents.InsertAsync`),
  and DTO shape (`BudgetMonthSavingsGoalEditorRowDto`). New slices must
  match.
- **`decimal` for all money. Dapper only. Parameterized SQL. Explicit
  columns.** No EF, no ORM helpers, no SELECT *.
- **Transaction discipline.** New mutation commands implement
  `ITransactionalCommand`. SQL UPDATE statements that mutate the snapshot
  AND the source plan run inside the same transaction (the
  `TransactionalBehavior` already wraps the handler).
- **Audit.** Every mutation writes one `BudgetMonthChangeEvent` row with
  `before` + `after` payloads, mirroring `SavingsGoalMutationApplier`.
- **Response envelope.** `Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(...))`
  on success, `ApiEnvelope<...>.Failure(...)` on validation errors —
  matches the controller helpers in `BudgetController.Editor.Savings.cs`.
- **FE: existing primitives first.** Reuse `BudgetEntryModalShell`,
  `MoneyInput`, `FormField`, `EditScopeRadioCards`, `CtaButton` — no
  parallel modal shell. Tailwind tokens stay eBudget-native (no new
  palette).
- **Read-only awareness.** Action chips and kebab items disable when
  `readOnly` (closed month) or the corresponding mutation is in flight.
- **i18n.** All new strings go through `savingsEditorPageDict` or a new
  dict file per modal. No bare strings in JSX.

## 5. After every PR

Per `CLAUDE.md`:

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed,
   files touched, validation, risks).
2. Write the commit message to `COMMIT_MSG.tmp`.
3. **Stop.** Do not commit, do not push, unless the user explicitly says so.
