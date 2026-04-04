---
applyTo: "**/*Tests*.cs"
---

# Test instructions

- Tests should prove behavior, not implementation trivia.
- Prefer descriptive test names.
- Use existing fixtures, seed helpers, and DSLs.
- Include happy path, guard path, and regression coverage where relevant.
- Do not over-mock repository logic that is better proven with integration tests.
