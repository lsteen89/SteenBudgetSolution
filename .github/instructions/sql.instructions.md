---
applyTo: "**/*.{sql}"
---

# SQL instructions

- Target MariaDB syntax.
- Keep SQL readable and explicit.
- Use clear aliases.
- Avoid hidden behavior and tricky one-liners.
- Prefer deterministic migration scripts.
- Be careful with destructive schema changes.
- Preserve idempotency where appropriate for seeds and support scripts.
- Avoid embedding complex logic in SQL when it can be handled in application code.
