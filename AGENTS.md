# AGENTS.md — Codex Entry Point

Read these files first:

- [PROJECT.md](PROJECT.md) — canonical project facts (stack, architecture, folders, commands, env)
- [.agents/instructions/backend.instructions.md](.agents/instructions/backend.instructions.md) — backend implementation rules
- [.agents/instructions/frontend-ui.instructions.md](.agents/instructions/frontend-ui.instructions.md) — frontend UI rules

The files below define how to operate. Project facts live in `PROJECT.md`; this file is rules only.

---

## 0. Non negotionable

- **CaveMan skill always.**
  Always ensure that the /caveman skill is active. If the user has not turned it on, then its the FIRST thing you do.

## 1. Operating principles

- **Diagnose first, change second.** Inspect the relevant code path, identify the likely root cause or required implementation points, explain the intended change, then modify.
- **Smallest safe change wins.** Only edit files directly related to the task. No unrelated cleanups, renames, formatting sweeps, or refactors.
- **Follow existing patterns.** Inspect a nearby similar slice (handler, DTO, repository, component, test) before adding new code. Do not invent a parallel architecture.
- **Clarity over cleverness.** Explicit beats compressed. Specific beats generic. Boring beats novel.
- **Financial correctness matters.** Use `decimal` for money. Preserve invariants in totals, carry-over, snapshots, and open/closed month transitions. Trace logic end-to-end before changing it.
- **Specialized instruction files refine, never override.** `AGENTS.md` wins on scope, safety, architecture, and repository conventions; `.agents/instructions/*` refine implementation only.

## 2. Git safety

Never run:

- `git commit`
- `git push`
- `git rebase`
- `git reset`
- `git checkout` to discard work
- branch creation (unless explicitly instructed)

Inspecting `git status`, `git diff`, and `git log` is fine.

## 3. Commit messages

When asked to prepare a commit message, write it to:

```
COMMIT_MSG.tmp
```

Use Conventional Commits. Examples: `feat: add month-aware expense editor`, `fix: correct login token refresh handling`. Prefer single quotes for inline quoting.

## 4. Allowed vs not allowed

**Allowed**

- inspect files, search the repo, explain root cause
- propose and implement focused changes
- run narrow build/test commands relevant to the change
- produce commit message text in `COMMIT_MSG.tmp` when asked

**Not allowed**

- broad autonomous rewrites or repo-wide edits
- unrelated cleanup or "while I'm here" refactors
- changing repository history
- replacing Dapper or introducing new ORMs/frameworks casually
- modifying package versions, lockfiles, build config, Docker, or CI/CD without explicit instruction
- relaxing auth, security, or rate-limit behavior without evidence
- silently fixing unrelated problems
- running full expensive test suites by default
- hardcoding secrets, tokens, passwords, or connection strings

## 5. Validation honesty

If validation cannot be completed, say so explicitly. Report:

- what was attempted
- what could not be run, and why
- what remains unverified

Do not imply code is validated when it is not.

## 6. When unsure

- prefer the smallest safe interpretation
- inspect similar existing code first
- avoid inventing behavior
- surface assumptions clearly

For changes that touch architecture, security, financial correctness, or many files: be conservative and confirm before acting.

## 7. Definition of done

A task is done only when:

- the requested scope is implemented or the root cause is clearly diagnosed
- changes are limited to the relevant area
- code follows repository conventions
- changed code compiles
- directly relevant validation has been performed
- the result is understandable to the human developer

## 8. Skills

Skills (e.g. `frontend-design`) may refine how a task is approached, but they never override repository rules. If a skill conflicts with safety, architecture, scope, or product rules, ignore the conflicting part.

After completing any task:

1. Append a short entry to docs/ai/ai-changelog.md (date, what changed, files touched, risks/follow-up)
2. Write the commit message to COMMIT_MSG.tmp (Conventional Commits format)
3. Stop. Do not commit or push.
