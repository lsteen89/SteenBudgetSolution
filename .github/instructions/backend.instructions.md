---
applyTo: "Backend/**/*.cs"
---

# Backend instructions

- Follow existing Clean Architecture boundaries.
- Use MediatR request/handler patterns already in the solution.
- Use Dapper for DB access; keep SQL explicit.
- Keep repository methods narrowly scoped.
- Prefer Result-based failure handling if that is the established pattern.
- Respect month-aware budgeting lifecycle rules.
- Avoid leaking Infrastructure concerns into Application contracts.
- Add tests for lifecycle, idempotency, and month-driven reads when changing those areas.
