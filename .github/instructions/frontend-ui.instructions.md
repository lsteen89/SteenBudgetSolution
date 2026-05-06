---
applyTo: "Frontend/**/*.{ts,tsx,css}"
---

# Frontend UI — Quick Reference

The canonical frontend / UI rules live in [`.agents/instructions/frontend-ui.instructions.md`](../../.agents/instructions/frontend-ui.instructions.md). This file is a short pointer for Copilot; the canonical file is the source of truth.

## Top 8 rules

1. This is a financial product. Calm, premium, trustworthy, restrained. No marketing-site theatrics in app UI (no preloaders, scroll-jacking, magnetic buttons, custom cursors).
2. Default visual direction is "Nordic Calm Premium" — strong typography hierarchy, generous spacing, soft surfaces, restrained accents.
3. Existing tokens are the source of truth: shadcn (`--background`, `--card`, …), eBudget (`--eb-shell`, `--eb-surface`, `--eb-text`, `--eb-accent`, `--eb-danger`, …), wizard (`--wizard-*`), and utilities like `shadow-eb`, `money`. Do not introduce a parallel palette.
4. Default font is `font-inter`. Improve hierarchy through size/weight/spacing — not random font swaps.
5. Money is the main content: readable totals, strong contrast, clear positive/negative semantics, consistent number alignment.
6. Read-only vs editable must be visually obvious. Closed months disable interactions intentionally; never imply editing is available when it is not.
7. Reuse existing primitives (buttons, inputs, cards, drawers, modals) before inventing. Match folder structure, naming, and composition style.
8. Loading / empty / error / partial / read-only / disabled states are mandatory — never ship only the happy path.

For the full ruleset, read the canonical file.
