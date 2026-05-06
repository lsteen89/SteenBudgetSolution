---
applyTo: "**"
---

# Copilot — General Instructions

Read these files before suggesting changes:

- [`PROJECT.md`](../../PROJECT.md) — stack, architecture, folders, dev commands, secrets.
- [`.agents/instructions/backend.instructions.md`](../../.agents/instructions/backend.instructions.md) — backend implementation rules.
- [`.agents/instructions/frontend-ui.instructions.md`](../../.agents/instructions/frontend-ui.instructions.md) — frontend UI rules.

The path-scoped files in this folder (`backend.instructions.md`, `frontend-ui.instructions.md`) mirror the canonical sources above and apply automatically by `applyTo` glob.

## Copilot quick conventions

- Diagnose before changing; inspect a nearby similar slice before adding new code.
- Keep scope tight: edit only what the task requires.
- Backend: .NET 8 + Dapper + MariaDB + MediatR feature slices. Do not introduce EF or other ORMs.
- Use `decimal` for money. Never `float`/`double`.
- Frontend: React + TypeScript + Vite + Tailwind. Reuse existing eBudget / wizard / shadcn tokens; do not invent a parallel palette.
- Match existing DTO, handler, validator, and component patterns.
- Preserve transaction discipline; do not bypass UnitOfWork or pipeline behaviors.
- Auth, security, Docker, Caddy, CI/CD, and env/secret config are off-limits without explicit instruction.
- Never commit secrets. Use `dotnet user-secrets`, `Frontend/.env.local`, or `.env.dev`.
- Git safety: no `commit`, `push`, `rebase`, `reset`, or destructive `checkout`. When asked for a commit message, write it to `COMMIT_MSG.tmp` (Conventional Commits).
- Validate honestly — say what was checked and what remains unverified.
