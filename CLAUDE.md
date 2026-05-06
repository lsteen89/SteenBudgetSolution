@PROJECT.md
@.agents/instructions/backend.instructions.md
@.agents/instructions/frontend-ui.instructions.md

# Claude Code — Operating Rules

- Diagnose before changing. Inspect the relevant slice, identify root cause, then edit. Do not jump straight to code.
- Plan before code on any non-trivial task. Use TodoWrite to track multi-step work; mark items done as you finish.
- Keep scope tight. Touch only files directly required by the request. Do not perform unrelated cleanup, formatting sweeps, or refactors.
- Run `/compact` when context usage approaches ~50% to keep the working window healthy.
- Commit after each completed task. Conventional Commits style. Never run `git push`, `rebase`, `reset`, or destructive `checkout`. When asked for a commit message, write it to `COMMIT_MSG.tmp`.
- This repo runs with `bypassPermissions`. That removes prompts; it does not remove judgement. Treat irreversible actions (deletions, force operations, secret edits) with the same care as in interactive mode.
- Never modify auth, security, Docker, Caddy, CI/CD, or environment/secret config without explicit instruction. Diagnose and report instead.
- Use `decimal` for money. Preserve transaction discipline and idempotency in lifecycle flows. Match existing feature-slice patterns.
- Validate honestly. Report what was built, what was checked, and what remains unverified. Do not imply success when validation was partial.
