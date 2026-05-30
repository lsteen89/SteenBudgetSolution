# PR 1 — Shared Money-Flow Editor Foundation

## Goal

Extract only the reusable money-flow editor primitives needed by expenses and
income, without changing expenses visually or behaviorally.

This PR prevents income from copy-pasting the completed expenses grammar.

## Scope

Frontend only.

Likely files:

- `Frontend/src/components/molecules/forms/budgetEditor/*`
- `Frontend/src/Pages/private/expenses/components/*`
- focused expense tests if extracted component contracts change

Do not touch income UI yet except types/import preparation if strictly needed.

## Candidate Extractions

Keep this conservative. Extract only pieces that are genuinely shared:

- compact editor hero shell/chrome
- allocation/balance strip shell
- segmented proportional bar with gap support
- ledger group card shell
- row action/menu shell helpers
- drawer footer/action layout helpers

Do not extract domain-specific expense concepts:

- expense category logic
- subscription lifecycle copy/status
- expense-specific plan deltas
- expense-specific math labels

## Objectives

- Expenses remain pixel-close and behaviorally unchanged.
- New shared primitives accept domain copy, colors, totals, and row content.
- Shared APIs are boring and explicit.
- No new design system, tokens, package dependencies, or lockfile changes.

## Acceptance Criteria

- Expenses still render the same money-flow editor grammar after extraction.
- No income production UI is implemented in this PR.
- Shared primitives live under the existing `budgetEditor` component area.
- Extracted components are typed and domain-agnostic.
- No user-facing expense copy changes unless required by the extraction.

## Validation

- `cd Frontend && npx vitest run src/Pages/private/expenses`
- `cd Frontend && npm run build`
- Manual browser check of `/dashboard/expenses` at desktop and mobile.

## Hard Stops

Stop and split the PR if extraction starts changing expense behavior, copy,
math, or lifecycle handling. This PR is foundation, not redesign.
