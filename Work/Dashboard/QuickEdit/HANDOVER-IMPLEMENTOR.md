# Handover Prompt - Implementor

Copy-paste the block below as the first message to a fresh coding agent when
implementing the Quick Edit shell foundation.

---

```text
You are implementing PR 02 of the Dashboard Quick Edit queue in the
SteenBudgetSolution repo.

Read these files in order before writing code:

1. AGENTS.md
2. PROJECT.md
3. .agents/instructions/frontend-ui.instructions.md
4. Work/Dashboard/QuickEdit/PR-00-current-state.md
5. Work/Dashboard/QuickEdit/PR-01-designer-handoff-ba-technical-analysis.md
6. Work/Dashboard/QuickEdit/PR-02-fe-quick-edit-shell-foundation.md
7. Frontend/src/components/organisms/pages/DashboardContent.tsx
8. Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx
9. Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.test.tsx
10. The four current panel files under
    Frontend/src/components/organisms/dashboard/editPeriod/
11. The period editor i18n dictionaries under
    Frontend/src/utils/i18n/pages/private/dashboard/cards/period/

Task:

Implement only PR 02: the tabbed Quick Edit drawer shell foundation.

Hard rules:

- Work on the current branch. Do not create a branch, commit, push, or open a
  GitHub PR.
- State the files you intend to edit before editing them.
- Keep the change frontend-only.
- Keep existing domain endpoints, hooks, payloads, mutations, and invalidation
  behavior.
- Save is active-tab only. There is no cross-domain save.
- Do not add backend code or a quick-edit aggregate endpoint.
- Do not add new domain actions: no create, delete, active toggle,
  skip/include, top-up, balance adjustment, fixed/housing expansion, or base
  savings editing.
- Do not implement the shared "free this month" equation in this PR.
- Do not copy prototype JavaScript from the design handoff.
- Use existing React/TypeScript/Tailwind patterns and eBudget tokens.
- All new UI copy must go through the existing i18n pattern for sv/en/et.
- Preserve existing relevant data-testid values unless the PR brief explicitly
  justifies changing them.
- Closed/skipped months must not gain edit affordances.

Expected implementation shape:

- Keep DashboardContent as the drawer open-state owner.
- Treat the current selected panel as the initial active tab.
- Refactor EditPeriodDrawer, or add a small QuickEditDrawer wrapper in the
  same module, so the drawer has four tabs: Income, Expenses, Savings, Debts.
- Opening from a dashboard pillar lands on that pillar's tab.
- Switching tabs does not close the drawer.
- Active tab loads immediately.
- Other tabs lazy-load on first visit.
- Do not fetch all four editor endpoints when the drawer opens.
- If a panel is visited, preserve its draft while the drawer remains open when
  this can be done without broad rewrites.
- Keep each panel responsible for its own save, loading, error, validation, and
  invalidation behavior.

Validation:

Run the narrowest relevant frontend tests from Frontend/. At minimum, run the
drawer tests, for example:

npm run test -- EditPeriodDrawer

If that exact filter is not supported, use the closest narrow command and say
exactly what you ran.

After implementation:

1. Append a short entry to docs/ai/ai-changelog.md with date, what changed,
   files touched, validation, and risks/follow-up.
2. Write a Conventional Commits message to COMMIT_MSG.tmp.
3. Stop. Do not commit, push, or open a PR.

If the PR brief is ambiguous, or if the implementation seems to require one of
the excluded BA/product decisions, stop and ask instead of guessing.
```

---

## Human Notes

This handover is intentionally narrow. The designer's full Quick Edit module is
larger than this PR, but the backend only guarantees per-domain transactions
today. The first implementation must establish the tabbed shell without
pretending one Save action can atomically persist multiple domains.

