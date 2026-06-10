# Implementor Agent Handover: Next-Month Preview And Dashboard MVP

## Role

You are the implementor agent for this roadmap.

Implement only the PR you are explicitly assigned. Do not jump ahead.

Read the PR catalog before coding:

```text
Work/Dashboard/NextMonthUnderstanding/PR/
```

## Product Decision

The roadmap uses a two-step architecture:

1. MVP: read-only next-month preview and dashboard clarity.
2. Later: persisted `planned` budget month for real next-month-only editing.

Do not implement next-month editing during MVP unless explicitly assigned to PR 5+.

## Non-Negotiable Rules

- Do not use `/api/budgets/dashboard?yearMonth={next}` as preview.
- Do not calculate preview money in the frontend.
- Do not materialize next month for read-only preview.
- Do not create multiple open months.
- Do not put future-plan editing into the current-month quick drawer.
- Do not silently apply next-month-only edits to budget-plan rows.
- Do not implement unrelated standalone HTML features.

## MVP Implementation Intent

MVP includes PR 1 through PR 4.

The dashboard result should:

- keep the current/open month hero as primary;
- add the next-month preview path and CTA;
- make `Review next month` / `Granska nästa månad` the main next-month action;
- show This month / Next month / Budget plan as distinct concepts;
- remove the current explanatory/help UI;
- replace it with three standalone cards underneath the next-month preview card;
- keep menus/nav/account controls unchanged.

## Standalone HTML Warning

The user will attach standalone HTML for the new dashboard features.

Treat it as a reference for the approved dashboard pieces only:

- next-month preview card;
- three standalone cards under the preview card;
- CTA direction;
- high-level card layout.

Do not copy or implement unrelated parts from the standalone HTML.

Do not change menus, nav, global shell, account controls, or unrelated dashboard sections because the standalone shows them differently.

If the standalone HTML contains something not listed in your assigned PR, stop and ask.

## PR Execution Rules

Before changing code:

1. Read the assigned PR file.
2. Inspect nearby existing slices/components/tests.
3. State the intended change.
4. Make the smallest safe edit.
5. Run focused validation.
6. Update `docs/ai/ai-changelog.md`.
7. Write `COMMIT_MSG.tmp`.
8. Stop. Do not commit or push.

## Architecture Guidance

Backend:

- .NET 8;
- Clean Architecture;
- MediatR feature slices;
- Dapper/MariaDB;
- explicit SQL;
- `decimal` for money;
- integration tests for lifecycle and financial behavior.

Frontend:

- React/TypeScript;
- existing dashboard/editor patterns;
- existing eBudget tokens and layout conventions;
- no fake financial math;
- concise state copy;
- clear read-only/preview/planned distinction.

## Carry-Over Rules

Before close:

```text
estimatedFullCarryOver = max(currentLive.finalBalanceWithCarryMonthly, 0)
```

This is estimated and non-final.

Final carry-over is applied only from the close snapshot.

Do not present estimated carry-over as final.

## Edit-Scope Rules

Every future edit action must be explicit:

| Scope | Meaning |
| --- | --- |
| `currentMonthOnly` | Edit current open month only |
| `plannedMonthOnly` | Edit next planned month only |
| `plannedMonthAndBudgetPlan` | Edit planned month and recurring plan |
| `budgetPlanOnly` | Edit recurring plan only |

Do not expose plan-forward controls for month-only rows unless backend has a valid source link.

## Route Model

MVP route:

```text
/dashboard/next-month
```

Do not add this for MVP:

```text
/dashboard/months/{yyyy-MM}/preview
```

That route implies arbitrary future-month support and is out of scope.

## API Contract

MVP:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Later only:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
GET /api/budgets/months/{plannedYearMonth}/planned-dashboard
```

## State Matrix

| State | Required behavior |
| --- | --- |
| Open current, no persisted next | Preview route and CTA are available after PR 1/2. |
| Open current, preview unavailable | Do not show fake next-month numbers. |
| Persisted next exists | Navigate/select the real persisted month. |
| No active open month | Show unavailable state. |
| Planned month exists later | Show planned state and selected-month editor entry. |
| Closed/skipped month | Read-only; no edit affordances. |

## Out Of Scope For MVP

- Editing unopened next month.
- Planned month creation.
- Editor selected-month refactor.
- Multiple open months.
- Frontend financial calculations.
- Arbitrary future preview routes.
- Nav/menu redesign.
- Extra standalone HTML features.

## Full PR List

- PR 1: Backend read-only next-month preview. Adds safe backend-owned preview numbers without materializing a month.
- PR 2: Frontend `/dashboard/next-month` preview page. Adds the dedicated read-only preview route.
- PR 3: Dashboard MVP layout and cards. Adds approved dashboard model, CTA change, preview card, and standalone card replacement.
- PR 4: Preview-aware Next button. Enables Next to route to preview when no persisted next month exists.
- PR 5: Planned month backend model. Adds persisted `planned` month lifecycle for real next-month-only editing.
- PR 6: Editor selected-month refactor. Makes full editor pages safely target selected open/planned months.
- PR 7: Planned next-month edit UX. Adds explicit next-month-only and budget-plan-forward edit actions.

Agent saying: Ready for your next decision
