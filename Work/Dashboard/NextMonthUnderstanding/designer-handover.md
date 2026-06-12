# Designer Handover

## User Problem

Users need to understand the budget model without reading documentation:

```text
Budget plan -> this month -> next month
```

Today the dashboard shows the current/open month well, but it does not make the relationship between current month, next month, and budget plan obvious enough.

The goal is not a full redesign. The goal is a clearer next-month path and less explanatory noise.

## Chosen Dashboard Direction

Keep the current month as the main hero.

Add a compact next-month planning layer and a three-card model underneath:

1. This month
2. Next month
3. Budget plan

The dashboard should teach the model through layout and labels. Avoid long helper paragraphs.

## Three-Card Model

### Card A: This Month

Purpose:

- confirm what the user is looking at now;
- reinforce that this is the active/open month;
- link to current allocation/breakdown.

Content candidates:

- `Denna månad`
- month label, e.g. `maj 2026`
- status pill, e.g. `Öppen`
- remaining/free amount if available
- action: `Se fördelningen`

### Card B: Next Month

Purpose:

- make the next planning step obvious;
- carry the primary CTA.

Content candidates:

- `Nästa månad`
- month label, e.g. `juni 2026`
- state:
  - `Förhandsvisning` if preview;
  - `Öppen` or normal status if already persisted/opened;
  - `Inte öppnad` if preview backend is unavailable.
- projected free amount only if backend provides preview data.
- primary action: `Granska nästa månad`.

This is the most important new card.

### Card C: Budget Plan

Purpose:

- name the recurring source of future months.

Content candidates:

- `Budgetplan`
- `Din vanliga månadsplan`
- optional totals only if backend provides plan summary.
- action: `Redigera budgetplan` only if route/actions truly support plan editing.

## Next-Month CTA

Primary action:

- Swedish: `Granska nästa månad`
- English: `Review next month`

This CTA and the active Next button should route to the same page:

```text
/dashboard/next-month
```

If the backend preview is not ready, the CTA should not show fake numbers. It may show a disabled/unavailable state or route to a page that clearly says preview is unavailable.

## Active Next Button Behavior

Current technical behavior:

- Next is disabled because month navigation only uses persisted months from `/api/budgets/months/status`.
- Unopened next month is not in that list.

Desired behavior after backend support:

- On active/open current month, Next routes to next-month preview.
- If next month already exists as a persisted month, Next routes to that real month.

Design implication:

- The Next button needs a preview-capable state, not just disabled/enabled.
- Preview navigation and persisted month navigation should feel related but not misleading.

## Required States

### Current Open, Next Not Opened

Dashboard:

- current hero remains active;
- next card says preview;
- CTA: `Granska nästa månad`;
- Next button routes to preview page.

Preview page:

- label: `Juni 2026 · Förhandsvisning`;
- clear that this is not active month yet;
- show backend preview values when available.

### Current Open, Next Persisted

Dashboard:

- next card should not call it only preview;
- CTA may become `Gå till nästa månad`.

Technical warning:

- current backend does not generally support current and next both being open.
- if next is persisted after close/start, current is likely no longer open.

### Current Closed/Read-Only

Dashboard:

- no edit affordances;
- recap stays historical;
- navigation to adjacent persisted months remains.

### Preview Unsupported

Dashboard:

- no fake numbers;
- short factual unavailable copy.

Preview page:

- can show “preview needs backend support” state for implementation staging, but not for MVP user-facing launch if avoidable.

### Month-Only Rows

Design must mark scope clearly:

- `Gäller bara juni`
- no plan-forward action if row is month-only.

## Technical Truths / Limitations

- There is no safe backend next-month preview endpoint today.
- Existing dashboard endpoint may create/materialize a month. It must not be used for preview.
- Existing editor pages edit `openMonthYearMonth`; they do not edit preview or selected future months.
- Quick drawer is current-month-only.
- Budget plan totals are not currently available as a dashboard summary.
- Carry-over before close is estimated, not final.
- Editing unopened next month only needs backend lifecycle/model work first.

## Copy Guidance

Use:

- `Denna månad`
- `Nästa månad`
- `Budgetplan`
- `Granska nästa månad`
- `Gå till nästa månad`
- `Förhandsvisning`
- `Gäller bara juni`
- `Uppdatera budgetplanen framåt`
- `Endast budgetplanen framåt`

Carry-over copy:

```text
Bygger på att maj stängs med 18 623 kr kvar. Beloppen fastställs när månaden stängs.
```

Avoid:

- default
- baseline
- source
- entity
- override
- fake precision
- shame/guilt language
- banking/transaction/spend-progress language

## What The Designer Should Decide

- Exact visual placement of the three cards relative to MoneyState and AttentionLane.
- Whether the next-month preview card is above or below the three-card row.
- The visual difference between:
  - preview/unopened next month;
  - actual persisted next month;
  - unavailable preview.
- Empty states for no budget-plan data.
- How much carry-over assumption should be visible on the card versus preview page.
- Whether `Budgetplan` card should link to one editor, a plan landing page, or no action until route support exists.

## What The Designer Must Not Invent

- Do not show next-month money values without backend preview data.
- Do not imply unopened next month already exists as editable month rows.
- Do not make quick drawer edit future months.
- Do not call plan-forward edits “next month only.”
- Do not introduce long educational copy blocks.
- Do not use implementation terms in UI.

