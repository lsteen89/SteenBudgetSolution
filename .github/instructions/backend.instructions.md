---
applyTo: "Backend/**/*.{cs,sql,json}"
---

# Backend — Quick Reference

The canonical backend rules live in [`.agents/instructions/backend.instructions.md`](../../.agents/instructions/backend.instructions.md). This file is a short pointer for Copilot; the canonical file is the source of truth.

## Top 8 rules

1. Preserve Clean Architecture — Domain has no dependency on Infrastructure; controllers stay thin; business logic stays in Application/Domain.
2. Dapper only. No EF, no other ORMs, no query builders that fight existing patterns.
3. Match the nearest existing feature slice (folder, naming, validation, transaction style) before adding handlers, DTOs, queries, or endpoints.
4. Use `decimal` for all money. Never `float`/`double`. Round explicitly, only when required.
5. Respect transaction boundaries. Repository methods may require an active DB transaction (UnitOfWork / pipeline behavior); diagnose, do not weaken guarantees.
6. Parameterize all SQL. Explicit selected columns. Preserve MariaDB compatibility.
7. Auth, security, and rate-limit code is conservative territory. Diagnose with evidence before changing.
8. Pass `CancellationToken` through async chains where the surrounding code already does.

For the full ruleset, read the canonical file.
