# Handover prompt — Implementor

Copy-paste the block below as the **first message** to a fresh Claude Code
session (or any other coding agent) when handing off the close-month
redesign. Replace `{PR_NUMBER}` with `01` or `02`.

---

```
You are implementing PR {PR_NUMBER} of the close-month redesign queue in the
SteenBudgetSolution repo.

Read these files in order before writing any code:

1. /CLAUDE.md (and the .agents/instructions/*.instructions.md it imports)
2. Work/Dashboard/CloseMonth/README.md
3. Work/Dashboard/CloseMonth/PR-{PR_NUMBER}-*.md  ← the brief for this PR
4. Work/Dashboard/CloseMonth/design/chat-transcript.md
5. Work/Dashboard/CloseMonth/design/ReviewHero.jsx       (if PR 01)
   Work/Dashboard/CloseMonth/design/HandoffTakeover.jsx  (if PR 02)
6. Work/Dashboard/CloseMonth/design/shared.jsx
7. The existing component the PR replaces:
   - PR 01 → Frontend/src/components/organisms/dashboard/closeMonth/CloseMonthReviewModal.tsx
   - PR 02 → Frontend/src/components/organisms/dashboard/closeMonth/ClosedMonthHandoffCard.tsx
8. Its sibling i18n dictionary in
   Frontend/src/utils/i18n/pages/private/dashboard/closeMonth/
9. Frontend/src/components/organisms/pages/DashboardContent.tsx (the call
   site — lines 207–390 are the relevant section)

After reading, follow the brief. Hard rules from the repo:

- Work on the current branch. Do NOT create a worktree.
- Plan before code; state which files you'll change and why before editing.
- Touch only files the brief lists. No opportunistic refactors.
- Use existing eBudget tokens (--eb-*) and existing primitives. No new
  palette. No new fonts.
- All copy goes through the i18n dictionaries (sv / en / et).
- Preserve every existing data-testid the brief flags.
- Closed/skipped/read-only months must not expose edit affordances.
- Decimal money on the backend; this PR is frontend-only.
- Honor `prefers-reduced-motion` — kill halos, mascot float, count-ups, and
  confetti.

When the implementation is done:

1. Run `npm run lint`, `npm run test`, and `npm run test:e2e:smoke` from
   Frontend/. Fix any failures.
2. Manually verify the affected modal/takeover in dev (npm run dev). Check
   all variants the brief lists (positiveFull, positiveKept, balanced,
   deficit; sv / en / et locales).
3. Append a short entry to docs/ai/ai-changelog.md (date, what changed,
   files touched, risks / follow-up).
4. Write the commit message to COMMIT_MSG.tmp using Conventional Commits
   format (e.g. `feat(close-month): rebuild review modal around hero layout`).
5. Stop. Do NOT commit, push, or open a PR.

If anything in the brief is ambiguous or the design conflicts with an
existing repo pattern, stop and ask before guessing. The brief and the chat
transcript are the source of truth for direction; the existing repo is the
source of truth for tokens, primitives, and accessibility patterns.
```

---

## When to use this prompt

- Spawning a fresh agent (Claude Code session, Cursor, Codex CLI, etc.) to
  work on the close-month redesign without prior context.
- Re-onboarding a stalled agent after a long pause.
- Handing the work off to a teammate as a written brief.

## Notes for the human handing off

- The brief assumes Inter is the app font and CSS tokens come from
  `colors_and_type.css` plus the eBudget palette. Don't let an agent install
  new fonts or add a parallel palette.
- The mascots (`CalcBird.png` for PR 01, `RichBird.png` for PR 02) are
  already in `Work/Dashboard/CloseMonth/design/mascots/`. The brief tells
  the agent where to copy them to in the repo.
- The recap surface (`ClosedMonthRecapSection.tsx`) is **out of scope**.
  If an agent starts touching it, redirect.
- PR 01 must merge before PR 02 starts; PR 02 reuses `useCountUp` and
  `YearChapterStrip` extracted by PR 01.
