# Reviewer Prompt: Next-Month Page

Review the implementation PR for `/dashboard/next-month`.

Use code-review stance: findings first, ordered by severity. Focus on bugs,
financial correctness, lifecycle regressions, missing tests, and misleading UX.

## Read First

Read:

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/backend.instructions.md`
- `.agents/instructions/frontend-ui.instructions.md`
- `Work/Dashboard/NextMonthUnderstanding/next-month-page-implementation-and-wiring.md`
- `Work/Dashboard/NextMonthUnderstanding/start-planning-designer-handoff.md`

Use design reference:

```text
/Users/linussteen/Downloads/Next Month (standalone)(1).html
```

Reference SHA-256:

```text
32b0520e8e3d2d5c9bdf46e6f4ba4639d9fefb3815e043fd7ae2dad07e175aa8
```

## Review Priorities

### P0 / P1: Must Catch

- Frontend computes or invents money totals instead of rendering backend data.
- Preview state writes data before user starts planning.
- Planned state still uses `next-preview` as active source instead of
  `GET /api/budgets/dashboard?yearMonth=`.
- `Start planning next month` closes or mutates current open month.
- Mutation does not use the open from-month.
- Query invalidation leaves page stuck in preview after successful create.
- Planned edit links omit `?yearMonth={plannedYearMonth}`.
- Editor navigation silently falls back to open month.
- UI implies a fake global budget-plan editor exists.
- UI implies closed months/current open month are edited by planned-month edits.
- Backend changes weaken lifecycle invariants or financial correctness.

### P2: Important

- Confirmation modal copy sounds like month close/open rather than create
  planned month.
- Error/pending states are missing or confusing.
- Success state appears before mutation succeeds.
- Empty-plan/unavailable states hide the way back to dashboard.
- Edit hub actions are implemented as fake modals instead of real navigation.
- Scope copy fails to distinguish planned-month-only from budget-plan-forward.
- Component extraction creates broad reusable abstractions for page-only UI.
- Visual port drifts away from eBudget tokens, spacing, or app shell.

### P3: Polish

- Standalone prototype labels leak into production.
- Button text wraps poorly on mobile.
- Card density is too marketing-like for eBudget dashboard UI.
- Motion ignores reduced-motion preference.

## Required Behavior Checklist

- Preview renders read-only projected data.
- Preview shows `Preview — nothing saved` or equivalent.
- Preview CTA calls `POST /api/budgets/months/{fromYearMonth}/next-planned`.
- Pending CTA cannot double-submit.
- Failed create shows retryable feedback.
- Successful create transitions to planned state through real data refresh.
- Planned state reads dashboard for planned target month.
- Planned edit hub has Income, Expenses, Savings, Debts.
- Every edit action includes planned `yearMonth`.
- Destination editors show selected-month context.
- Copy says default edits apply only to planned month.
- Copy says budget-plan-forward scope is chosen inside editor.

## Tests To Look For

Expect focused tests covering:

- preview data render;
- start-planning mutation call;
- pending and error states;
- planned dashboard read;
- planned edit link URLs;
- scope copy;
- unavailable/error/loading states.

Editor confidence should exist or be extended for:

- planned `?yearMonth` stays selected;
- selected-month banner appears;
- mutations target selected month;
- closed/skipped selected month remains read-only;
- invalid selected month does not fall back silently.

## Reviewer Output

Return:

1. Findings with file/line references.
2. Open questions or assumptions.
3. Short change-summary context.
4. Validation gaps.

If no issues, say so directly and list residual risk.
