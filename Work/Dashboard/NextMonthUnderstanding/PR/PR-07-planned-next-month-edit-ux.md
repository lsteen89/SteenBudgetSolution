# PR 7: Planned Next-Month Edit UX

## Goal

Expose real next-month editing from the preview/planned-month experience after the backend planned-month model and selected-month editors exist.

## Scope In

- On `/dashboard/next-month`, show whether the next month is:
  - read-only preview;
  - planned and editable;
  - already open/persisted.
- Provide an explicit action to create or enter planned next month when allowed.
- Add edit actions with clear scopes:
  - edit next month only;
  - update budget plan forward;
  - budget plan only where relevant.
- Route planned-month editing into the full editor pages with selected `yearMonth`.
- Show Swedish/English copy that makes the edit scope impossible to miss.

## Scope Out

- No quick drawer future editing.
- No automatic plan-forward updates on current-month close.
- No arbitrary future-month editing.
- No multiple planned future months.
- No broad dashboard redesign.

## Backend Files / Areas Likely Touched

Only if gaps remain from PR 5/6:

- planned-month create/read endpoint refinements;
- edit-scope validation;
- planned dashboard read endpoint.

## Frontend Files / Areas Likely Touched

- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx`
- dashboard preview components.
- editor route helpers.
- editor action components/copy.
- i18n for planned/preview/edit-scope labels.
- tests for preview/planned/open states.

## Data Contracts / DTOs

Preview/planned page state should clearly distinguish:

```ts
type NextMonthPageState = "preview" | "planned" | "open" | "unavailable";
```

Edit actions should carry explicit scope, not infer it from route alone.

## Tests Required

- Read-only preview state has no edit controls.
- Planned state exposes next-month-only edit actions.
- Planned edit actions route to full editor pages with selected `yearMonth`.
- Budget-plan-forward actions are visually and semantically distinct.
- Already-open state routes/selects the real persisted month.
- Quick drawer still edits current/open month only.

## Risks

- User thinks they are editing June only but changes the recurring plan.
- User thinks preview numbers are final.
- Full editors may still carry open-month assumptions.
- UI copy may understate the scope of plan-forward edits.

## Dependencies

- PR 5.
- PR 6.

## Definition Of Done

- Users can clearly choose next-month-only versus budget-plan-forward edits.
- Planned-month editing uses real persisted planned rows.
- Close current month promotes planned rows without rewriting budget plan.
- Preview, planned, and open states are visually distinct.

