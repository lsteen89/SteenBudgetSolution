# Work — Dashboard / CloseMonth

Implementation queue for the **close-month redesign** from the eBudget
design-system handoff bundle (chat transcript: "Close Month Dopamine").

The close-month *backend* and a working *baseline frontend* already exist in
the repo. This queue is a **visual / UX redesign** of two surfaces:

1. The pre-close confirmation modal (`CloseMonthReviewModal`)
2. The post-close handoff (`ClosedMonthHandoffCard`)

The recap surface for browsing back to a closed month
(`ClosedMonthRecapSection` and its detail blocks) is **out of scope** for this
queue — it stays as-is.

## How to use this folder

Each `PR-NN-*.md` file is a self-contained brief for one coding agent. Open
one file, implement that PR only, validate it, append the AI changelog entry,
write `COMMIT_MSG.tmp`, then stop.

Implement PRs in numeric order. PR 1 (Review modal) must land before PR 2
(Handoff takeover) so the modal's i18n keys and shared primitives
(`useCountUp`, year-strip) are in place for the takeover to reuse.

If you are spawning a fresh agent, use `HANDOVER-IMPLEMENTOR.md` as the
starter prompt and `HANDOVER-REVIEWER.md` as the review prompt.

## Source material

Local (frozen copy of the relevant design bundle slice):

- `design/closeMonth-explorations.html` — the prototype shell
- `design/ReviewHero.jsx` — **target** redesign for PR 1
- `design/HandoffTakeover.jsx` — **target** redesign for PR 2
- `design/shared.jsx` — design helpers (`useCountUp`, `CmConfetti`,
  `CmYearStrip`, money formatters)
- `design/ReviewBaseline.jsx` — faithful rebuild of the *current* modal, kept
  for visual comparison
- `design/HandoffBaseline.jsx` — faithful rebuild of the *current* handoff
- `design/HandoffConfetti.jsx` — V1 inline variant, **not chosen**
- `design/design-canvas.jsx` — full A/B canvas that wraps all variants
- `design/chat-transcript.md` — the chat that locked in the direction
- `design/mascots/CalcBird.png` — used by PR 1 (modal corner peek)
- `design/mascots/RichBird.png` — used by PR 2 (takeover hero)

Original design URL (re-fetch only if the local copy is stale):

```
https://api.anthropic.com/v1/design/h/HAYYwo5ssvANUmw_3gWgdg?open_file=explorations%2FcloseMonth%2FcloseMonth-explorations.html
```

The bundle is gzip + tar (~22 MB extracted). WebFetch trips its 10 MB limit;
use `curl` then `gunzip -c | tar -xf -` if you need to refetch.

## Direction locked in

From `design/chat-transcript.md` ("Close Month Dopamine"):

- **Review modal:** *Hero Remaining* variant.
- **Post-close handoff:** *V2 · Full takeover* variant.
- **Dismiss path:** session-only, manual dismiss (same trigger condition as
  today's `closeMonthReview.justClosed` flag).
- **Single forward CTA** on the takeover ("Fortsätt till {nextMonth}"). Drop
  the secondary "Granska april" CTA — april is already underneath. Keep a
  small "Stanna i april en stund" link + top-right X for the stay path.

Brand voice unchanged: calm, no shame, no exclamation marks. The mascot
celebrates; the UI stays composed.

## Current state — verified in repo

**Backend** (`Backend/Application/Features/Budgets/Months/`)

- `CloseBudgetMonth/CloseBudgetMonthCommandHandler.cs` — closes the month.
- `CloseBudgetMonth/CloseMonthSavingsGoalCompletionApplier.cs` — applies
  selected savings-goal completions at close.
- `Recap/GetBudgetMonthRecapQueryHandler.cs` — read endpoint for closed
  months (powers `ClosedMonthRecapSection`).
- `BudgetController.MonthLifecycle.cs` — endpoints.
- `CloseBudgetMonthResultDto`, `Errors.BudgetMonth`.

**Frontend close path** — wired in
`Frontend/src/components/organisms/pages/DashboardContent.tsx` (lines 308–386):

- *Open month:* `ReturningDashboardSection` + `CloseMonthReviewModal` (today's
  calm radio-card confirmation modal).
- *Just-closed (session-local):* inline green strip `ClosedMonthHandoffCard`
  rendered above the recap, driven by
  `useCloseMonthReviewController.justClosed`.
- *Already-closed:* `ClosedMonthRecapSection` — hero, KPI cards,
  compare/categories chart, subscription insight, savings/debt detail blocks,
  next-step card.
- *Skipped:* `SkippedMonthState`.
- `PeriodControlBar` swaps to lock icon, "closed" status, and a "Continue to
  {next month}" action. `MonthArchivePopover` lets you jump back to prior
  closed months.

Hook layer: `useCloseMonthReviewController`, `useBudgetMonthRecapQuery`,
`useDashboardSummary`, `getCloseAvailabilityLabel`.

## Prior close-month merges (context, not work)

The history below is for the implementor's situational awareness only. None of
these need to be re-done; they describe what already shipped.

| PR / Commit | What it shipped |
| --- | --- |
| `#259` Feature/close month | Initial close-month flow (modal + backend) |
| `#260` Feature/close month | Second iteration of close-month flow |
| `#266` Feature/close month card | Introduced `ClosedMonthHandoffCard` (the green strip this queue replaces) |
| `#263` fix: expose carry-over outcome | Carry-over outcome surfaced in recap DTO |
| `#268` test: update carry-over smoke expectations | E2E expectations refreshed |
| `c184b744` Polish closed month review hero flow | Recap hero refinement |
| `36908110` Introduced closed month recap | Recap section + sankey |
| `3b3e1225` Polish closed month recap hierarchy and motion | Recap polish |
| `42c71b41` feat(savings): complete goals from close-month modal | Completion-candidates section in modal |
| `e244dc09` Seeded user `devhistory@local.test` | Local-dev historical year for testing close flow |

Search `git log --all --oneline | grep -iE "close|recap|handoff"` for the
complete trail.

## PR queue (this redesign)

| PR | File | Title | Depends on | Side | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `PR-01-fe-review-hero-modal.md` | Rebuild `CloseMonthReviewModal` around the Hero Remaining layout | — | FE | Plan |
| 2 | `PR-02-fe-handoff-takeover.md` | Replace `ClosedMonthHandoffCard` with the V2 full-takeover interstitial | PR 1 | FE | Plan |

Recommended build order: PR 1 → PR 2. PR 1 introduces shared primitives
(`useCountUp`, mascot import path, year-chapter strip) that PR 2 reuses. Both
PRs are frontend-only.

## Non-goals

- Do not touch backend close, recap, or lifecycle handlers.
- Do not redesign `ClosedMonthRecapSection` or its detail blocks.
- Do not change `useCloseMonthReviewController`, the close mutation, or the
  savings-completion flow logic.
- Do not introduce a new palette. Use existing `--eb-*` tokens.
- Do not add a new font. The app already runs Inter globally.
- Do not relax the "no exclamation marks, no shame on deficits" brand voice.
- Do not touch auth, Docker, Caddy, CI/CD, or env/secret config.

## Repo rules every PR agent must follow

- Diagnose first; inspect the nearest current implementation.
- Smallest safe change wins.
- Use existing eBudget tokens and shared primitives.
- All strings go through i18n dictionaries (sv / en / et).
- Closed/skipped/read-only months must not expose edit affordances.
- Preserve existing `data-testid` values so smoke and full E2E keep passing.
- After completing a PR:
  1. append a short entry to `docs/ai/ai-changelog.md`
  2. write `COMMIT_MSG.tmp` (Conventional Commits style)
  3. stop; do not commit or push.
