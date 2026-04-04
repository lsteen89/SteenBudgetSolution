# eBudget Copilot Instructions

You are working on eBudget, a private budgeting web app.

## Product intent

- Calm, premium, Nordic-clean budgeting experience.
- Primary users are ordinary people and households.
- UX must reduce cognitive load and guide users toward what matters now.
- No shame language. Use neutral copy like "review", "adjust", and "consider".

## Tech stack

- Frontend: React, Vite, TypeScript, Tailwind
- Backend: ASP.NET Core, MediatR, Dapper, MariaDB
- Architecture: clean architecture, clear separation of concerns, small reusable components, SRP
- Infrastructure: production-grade patterns, safe defaults, explicit validation

## General engineering rules

- Prefer small, focused changes over broad rewrites unless explicitly requested.
- Do not invent backend behavior or database fields.
- Preserve existing naming conventions unless the current naming is clearly broken.
- Avoid duplication. Extract shared logic when it becomes real duplication.
- Always keep code readable and production-grade.
- Avoid magical abstractions.
- Favor explicit flows over clever code.

## Backend rules

- Use Dapper for data access.
- Keep SQL explicit and readable.
- Keep handlers thin. Put business logic in services/domain logic where appropriate.
- Validate commands early.
- Respect transaction boundaries.
- Return existing result/envelope patterns used by the codebase.
- Do not mix query/read-model logic with command/update logic.
- Prefer idempotent operations where lifecycle flows can be retried.

## Frontend rules

- Output TSX + Tailwind.
- Reuse existing UI primitives and layout patterns before inventing new ones.
- Keep one clear primary action per view.
- Prefer composition over prop-heavy components.
- Handle loading, empty, partial, and error states.
- Accessibility is required: keyboard-first, visible focus, AA contrast, reduced motion support.
- Money must be easy to read: aligned decimals, stable currency formatting, clear positive/negative semantics.

## Design system rules

- Use the project palette and token hierarchy already defined in the repo docs.
- Use rounded-2xl surfaces, clear borders, soft blue-tinted shadows.
- Avoid muddy gray text; use the text hue with opacity hierarchy.
- Green is only for forward motion or positive totals.
- Red is only for attention-required states.

## Testing rules

- Add or update tests for non-trivial backend behavior.
- Prefer integration tests for repository and lifecycle behavior.
- Prefer focused unit tests for pure projection/calculation logic.
- Do not remove tests to make builds pass.

## When implementing features

- First understand existing patterns in nearby files.
- Match existing folder structure and code style.
- State assumptions clearly in comments only when necessary.
- If requirements are ambiguous, choose the safer and simpler implementation.
