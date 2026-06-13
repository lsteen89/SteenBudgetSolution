# Start Planning Designer Handoff

## Goal

Refine the designer standalone for the real product flow.

Source design:

```text
/Users/linussteen/Downloads/Next Month (standalone)(1).html
```

Reference SHA-256:

```text
32b0520e8e3d2d5c9bdf46e6f4ba4639d9fefb3815e043fd7ae2dad07e175aa8
```

The standalone looks good and the overall page direction is approved. The
newer standalone resolves the biggest start-planning problem by keeping the
flow on this page, adding create pending/success/failure states, and modelling
an optional confirmation modal. Keep that direction.

The remaining risk is any implication that there is a separate planning page or
a global budget-plan editor. We do not want that for this implementation.

Design the flow as one page:

```text
/dashboard/next-month
```

The same page owns both states:

```text
Preview -> Start planning -> Planned
```

No separate `/dashboard/next-month/start` page. No separate planning wizard.

## Product Decision

`Start planning next month` should happen on `/dashboard/next-month`.

Preferred interaction:

- a clear action panel on the page, or
- a small confirmation modal/popup module before creating the planned month.

Both are acceptable. The designer should choose the calmer, clearer option.

Recommendation: use an inline action panel by default, with a modal only if the
designer believes the side effect needs confirmation.

## What The Button Really Does

When user clicks `Start planning next month`:

1. Backend creates a real planned next month from the budget plan.
2. Current open month stays open.
3. Planned next month becomes editable.
4. Same page changes from preview state to planned state.
5. User edits income, expenses, savings, or debts through the existing full
   editor pages.

This is not a separate planning workspace. It is a lifecycle transition inside
the next-month page.

## Current Backend / Frontend Support

Already real:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
```

Already real editor routes:

```text
/dashboard/income?yearMonth={plannedYearMonth}
/dashboard/expenses?yearMonth={plannedYearMonth}
/dashboard/savings?yearMonth={plannedYearMonth}
/dashboard/debts?yearMonth={plannedYearMonth}
```

Already real state model:

- `preview`: read-only projection, nothing saved.
- `planned`: materialized next month, editable before it opens.
- `open`: defensive case, dashboard handles real open-month navigation.
- `unavailable`: no open month to project from.

## Required Designer Correction

The standalone has a fake modal:

```text
Update your budget plan
This opens the budget-plan editor...
```

Do not design this as a real route or real CTA yet.

Current product does not have a global budget-plan editor page. Budget-plan
forward changes happen inside the existing pillar editors, row by row, where
the user can choose scope.

So the page should say:

- You can edit the planned month now.
- Some editor rows let you also update the budget plan forward.
- Choose that scope inside the editor when you make the actual change.

Do not show a big global `Update budget plan` button unless it is visually
clearly informational/non-primary and does not imply a real page exists.

## Preview State Design

Purpose:

- show what next month looks like if nothing changes;
- explain that this is not saved yet;
- let user create a planned month.

Must include:

- month label;
- `Preview` / `nothing saved` state pill;
- backend preview money surface;
- estimated carry-over note;
- `Start planning next month` action;
- comparison/lifecycle panels if useful.

Start-planning action copy options:

- `Start planning next month`
- `Create planned month`
- `Make this editable`

Best copy direction:

```text
Start planning next month
```

Supporting copy:

```text
Create a planned version of June so you can adjust it before May closes.
May stays open. You can still close it later as usual.
```

Avoid:

- "Open next month"
- "Start next month"
- "Move to next month"
- any copy that sounds like current month closes immediately.

## Optional Confirmation Modal

If designer chooses a modal, keep it small and specific.

Modal title:

```text
Create planned June?
```

Body:

```text
This creates an editable planned month from your budget plan. May stays open.
Final carry-over is applied when May closes.
```

Primary:

```text
Create planned month
```

Secondary:

```text
Not now
```

Modal must not ask the user to choose carry-over, choose rows, or review a long
checklist. That would turn this into a wizard. We do not need that.

## Planned State Design

Purpose:

- confirm next month is now planned;
- make edit actions obvious;
- keep scope honest.

Must include:

- `Planned` state pill;
- success ribbon or confirmation after creation;
- money surface from planned month;
- edit hub with four pillar actions:
  - Income
  - Expenses
  - Savings
  - Debts
- clear scope line:

```text
Edits open the full editor for June. Changes apply only to June unless you
choose a budget-plan-forward scope inside the editor.
```

The edit hub actions should route to existing pillar editors. They are not
modals in this page.

## Success Moment

After start planning succeeds, design a quiet success state.

Good:

```text
June is planned
You can now adjust the month before it opens.
```

Use as:

- brief success ribbon above the money surface, or
- inline confirmation inside the edit hub.

Do not use confetti, large celebration, or marketing-style animation. This is a
financial workflow.

## Budget-Plan-Forward Copy

This is the hard part. We must not blur scopes.

Use:

- `Only for June`
- `June and future months`
- `Budget plan going forward`
- `Choose scope inside the editor`

Avoid:

- `Change every month` as a primary CTA on this page;
- `Update all months`;
- `Default`;
- `Baseline`;
- anything implying closed months change.

If design needs a label for the informational block:

```text
Need this change every month?
```

Body:

```text
Open the relevant editor and choose a budget-plan-forward scope on the row you
change. Closed months are never changed.
```

This can be a small explanatory block, not a primary CTA.

## Page Layout Direction

Keep designer standalone structure:

- header;
- main money surface;
- right-side action/lifecycle column on desktop;
- stacked layout on mobile;
- comparison/lifecycle support cards;
- planned edit hub after planning.

But adjust lifecycle behavior:

- preview action panel creates planned month;
- planned state replaces preview action panel with edit hub;
- comparison/lifecycle cards can remain on page, but must reflect real current
  state;
- no separate start page.

## States To Design

### Preview / Ready

- show preview money;
- show start-planning action;
- show estimated carry-over.

### Preview / Creating

- disable primary CTA;
- button text like `Creating planned month`;
- subtle spinner/progress, no layout jump.

### Preview / Create Failed

- stay in preview state;
- show short error near action panel;
- allow retry.

### Planned / Just Created

- show success ribbon;
- planned pill;
- edit hub visible.

### Planned / Existing

- no success ribbon needed unless creation just happened;
- edit hub visible.

### Empty Plan

- no fake money;
- explain that budget plan needs income/expenses first;
- do not show start planning if planned month would be meaningless.

### Unavailable

- no open month to project from;
- factual empty state.

## Design Guardrails

Do not:

- design a separate start-planning page;
- design a global budget-plan editor as if it exists;
- imply current month closes when planning starts;
- imply preview values are final;
- let user edit preview rows;
- put future-month editing into current dashboard quick drawer;
- show frontend-invented money;
- use bank/transaction/spending tracker language.

Must:

- look like eBudget;
- use existing eBudget tokens and calm product language;
- keep preview and planned states visually distinct;
- make "planned month only" vs "budget plan forward" impossible to confuse.

## Deliverable Requested From Design Agent

Produce an updated design handoff for `/dashboard/next-month` that:

1. Keeps the approved standalone visual direction.
2. Reframes `Start planning next month` as same-page action.
3. Specifies whether the start action is inline panel or confirmation modal.
4. Removes any implication of a separate start page.
5. Removes any fake global budget-plan editor CTA.
6. Designs preview, creating, failed, planned, and just-created states.
7. Provides final copy for the start-planning panel/modal and planned edit hub.
8. Keeps eBudget visual identity intact.

## Recommended Final Product Shape

Best path:

```text
/dashboard/next-month
  preview state
    Start planning next month
      optional confirm modal
      POST /next-planned
  planned state
    success ribbon if just created
    edit hub links to pillar editors with ?yearMonth=
    scope explanation for budget-plan-forward edits
```

Simple. Correct. No fake page. No fake plan editor.
