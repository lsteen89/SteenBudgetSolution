# Handover Prompt - Reviewer

Copy-paste the block below as the first message to a fresh review agent when
reviewing PR 02 of the Quick Edit queue. Replace `{BRANCH_OR_DIFF}` with the
branch name or diff command under review.

---

```text
You are reviewing PR 02 of the Dashboard Quick Edit queue in the
SteenBudgetSolution repo.

Diff under review: {BRANCH_OR_DIFF}

Read these before reviewing:

1. AGENTS.md
2. PROJECT.md
3. .agents/instructions/frontend-ui.instructions.md
4. Work/Dashboard/QuickEdit/PR-00-current-state.md
5. Work/Dashboard/QuickEdit/PR-01-designer-handoff-ba-technical-analysis.md
6. Work/Dashboard/QuickEdit/PR-02-fe-quick-edit-shell-foundation.md
7. Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx
8. Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.test.tsx

Review stance:

Prioritize behavioral regressions, financial dishonesty, accidental product
scope expansion, accessibility regressions, and missing focused tests.

Blocking issues:

- The PR introduces cross-domain save behavior.
- The PR sequentially saves multiple domains while presenting it as one safe
  save.
- Opening the drawer fetches every editor endpoint before those tabs are
  visited.
- Saving from one tab mutates another domain.
- Existing current-month-only payload semantics changed.
- The PR adds backend code, endpoint changes, DTO changes, package changes, or
  CI/build config changes.
- The PR adds excluded domain behavior: create, delete, active toggle,
  skip/include, top-up, debt balance adjustment, fixed/housing expansion, base
  savings editing, or shared free-money projection.
- Carry-over is treated or described as income.
- Debt planned payment is described as actual payment or balance reduction.
- Closed/skipped/read-only paths gained edit affordances.
- New visible copy is hard-coded in TSX instead of i18n.
- Only one locale was updated.
- Escape, overlay close, focus handling, or modal aria behavior regressed.
- Existing relevant tests were deleted instead of adapted.

Review checklist:

- Quick-adjust from each pillar opens the matching tab.
- Tab switching keeps the drawer open.
- Tab labels are accessible by role/name.
- The active tab is visually obvious.
- Only active or visited panels are mounted.
- Unvisited panels do not run their editor queries.
- Each panel still owns its own mutation, loading, validation, and error state.
- Existing full-editor navigation still routes to the correct page.
- Existing data-testid values remain stable unless the brief justified a
  replacement.
- Styling uses existing eBudget tokens and primitives. No new palette, font,
  global background, or marketing treatment.
- Tests cover initial tab, tab switching, lazy mounting, active-tab save
  boundaries, and close behavior.
- docs/ai/ai-changelog.md and COMMIT_MSG.tmp were updated.

Deliverables:

Reply with:

1. Blocking issues, each with file:line and a one-line fix.
2. Non-blocking issues, each with file:line and a one-line fix or follow-up.
3. A one-sentence ship/hold recommendation.

Keep the review short. Do not give generic advice. If no blocking issues exist,
say that directly and name any residual test risk.
```

---

## Human Notes

This reviewer prompt is strict by design. PR 02 is a shell foundation, not the
full designer prototype. Reject scope creep even if the UI looks better.

