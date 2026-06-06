# Handover prompt — Reviewer

Copy-paste the block below as the **first message** to a fresh Claude Code
session (or any other review-capable agent) when reviewing one of the
close-month redesign PRs. Replace `{PR_NUMBER}` with `01` or `02`, and
`{BRANCH_OR_DIFF}` with the branch name or `git diff` command you want
reviewed.

---

```
You are reviewing PR {PR_NUMBER} of the close-month redesign queue in the
SteenBudgetSolution repo.

Diff under review: {BRANCH_OR_DIFF}
(use `git diff master...HEAD` or `git diff master -- <files>` if the agent
needs to scope it)

Read these before reviewing:

1. /CLAUDE.md and .agents/instructions/frontend-ui.instructions.md
2. Work/Dashboard/CloseMonth/README.md
3. Work/Dashboard/CloseMonth/PR-{PR_NUMBER}-*.md  ← the implementation contract
4. Work/Dashboard/CloseMonth/design/chat-transcript.md
5. Work/Dashboard/CloseMonth/design/ReviewHero.jsx       (if PR 01)
   Work/Dashboard/CloseMonth/design/HandoffTakeover.jsx  (if PR 02)

Then review the diff against this checklist.

## Brand voice and design fidelity

- Calm, no shame, no exclamation marks. Mascot celebrates; UI stays composed.
- Hierarchy: hero number is the focal point (PR 01) or stamp + headline +
  mascot (PR 02). Stat strips read as secondary.
- Tokens only: `--eb-*`, eBudget shadows (`shadow-eb`), money utilities. No
  new palette. No parallel color system.
- Inter only. No new fonts introduced.
- All copy comes from the i18n dictionary. No hard-coded Swedish/English
  strings in TSX.

## Financial UI correctness

- Money values use the existing `formatMoneyV2` / `formatSnapshotMoney`
  helpers; no ad-hoc `toFixed(2)` or `Intl.NumberFormat` calls in JSX.
- Signs: incoming carry-over is auto-signed, income is `+`, expenses /
  savings-debt are `-`, remaining is plain. Matches the existing
  `formatSigned` / `formatAutoSigned` conventions.
- Decimal precision preserved end-to-end. No accidental coercion to `number`
  that drops digits.
- Read-only state: nothing in the closed/skipped path exposes an edit
  affordance.

## Behavior parity with the controller

- The component's public signature has not drifted. Props removed by the PR
  are unused; props added are documented in the brief.
- `onConfirm`, `onClose`, `onSelectCarryOverMode`, `onToggleCompletionGoal`
  (PR 01) and `onContinue`, `onDismiss` (PR 02) are still called with the
  same shape the controller produces.
- Existing `data-testid` values from the brief's preserve list are intact.

## Accessibility

- Modal / dialog wrappers retain `role="dialog"` and proper `aria-*`
  attributes (labelled-by, modal).
- Focus trap works; ESC dismisses; focus restoration on close.
- All decorative imagery (mascot, blobs, halos, confetti, illos) has
  `aria-hidden="true"`.
- `prefers-reduced-motion` disables: halo breathing, mascot float, count-ups,
  confetti, stamp settle, headline rise.
- Color contrast on text ≥ 4.5:1 against its background. Verify the rose
  deficit text and the muted hint copy.

## Code quality

- No `any` introduced.
- No new "helper" abstractions that don't pull weight.
- No dead code from the old implementation left behind unless the brief
  authorized it.
- Component file stays focused; nothing leaked into unrelated files.
- New primitives the brief promised to extract (`useCountUp`,
  `YearChapterStrip`, `SoftConfetti`) actually live at their declared paths.

## i18n

- All three locales (sv / en / et) have the new keys.
- Token placeholders (`{month}`, `{nextMonth}`, `{amount}`, `{monthOnly}`,
  `{closed}`, `{year}`) match the brief's table.
- No `{token}` leaks at runtime — test by switching locale.

## Tests

- Existing tests in `closeMonth/__tests__/` updated, not deleted.
- New tests cover the variants the brief lists (positiveFull, positiveKept,
  balanced, deficit).
- Reduced-motion paths covered.

## Deliverables

Reply with:

1. A short list of *blocking* issues (must fix before merge), each with
   file:line and a one-line fix.
2. A short list of *non-blocking* issues (nice to fix or follow-up).
3. A one-sentence "ship / hold" recommendation.

Keep it under ~300 words unless there's a major issue. Be specific. No
generic "consider adding tests" comments — only call out gaps the brief
required.
```

---

## When to use this prompt

- Reviewing a PR before merge.
- Self-review pass after the implementor finishes but before opening the PR.
- Spawning an independent second opinion alongside human review.

## Notes for the human

- For a deeper review run `/code-review high` from the repo root once the
  diff is on a branch. The prompt above is for *agent-driven* design and
  behavior review — `/code-review` covers correctness and reuse.
- If the reviewer flags blocking issues, send them back to the implementor
  with the file:line list. Do not edit the same agent's branch from a
  reviewer session.
