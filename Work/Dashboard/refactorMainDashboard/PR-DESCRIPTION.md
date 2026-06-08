# PR Description - Main Dashboard Refactor Planning

## Title

```text
docs: plan open-month dashboard refactor
```

## Summary

This PR prepares the implementation sequence for the open-month main dashboard
refactor. It is planning-only: no frontend, backend, endpoint, build, package,
or CI changes are included.

The planning package defines:

- current dashboard behaviour and data boundaries
- available dashboard, lifecycle, recap, and editor endpoints
- design constraints for an honest budget-planning dashboard
- implementor handover for the locked Spine direction
- reviewer handover and rejection checklist
- PR sequencing notes for review and future implementation slices
- standalone copy-paste prompts for implementor and reviewer agents

## Why

The current open-month dashboard has useful actions, but its hierarchy is too
weak. The redesign should make the remaining money and the allocation equation
clear inline while preserving lifecycle safety, lazy editor reads, and quick vs
full editor boundaries.

## Scope

Included:

- `README.md`
- `current-dashboard-analysis.md`
- `endpoint-inventory.md`
- `designer-handoff.md`
- `HANDOVER-IMPLEMENTOR.md`
- `HANDOVER-REVIEWER.md`
- `PR-SEQUENCE.md`
- `PR-DESCRIPTION.md`
- `PROMPT-IMPLEMENTOR.md`
- `PROMPT-REVIEWER.md`

Excluded:

- no code implementation
- no API or DTO changes
- no package or lockfile changes
- no visual asset changes
- no branch, commit, push, or GitHub PR action from this file alone

## Validation

Documentation was reviewed against the current repository structure and the
fetched dashboard design bundle. No build or test command is expected for this
planning-only PR.

## Reviewer Focus

Review for correctness of scope, sequencing, endpoint honesty, financial
invariants, and whether the implementor/reviewer handovers are strict enough to
prevent an implementation from drifting into banking-style data, over-fetching,
or closed-month edit affordances.
