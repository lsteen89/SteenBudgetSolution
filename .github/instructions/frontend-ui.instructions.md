---
applyTo: "Frontend/**/*.{ts,tsx,css}"
---

# Frontend UI Agent Instructions

This file defines how AI coding agents should design and implement frontend UI in this repository.

It does **not** override the repository-wide rules in `AGENTS.md`.
It complements them.

The goal is to produce frontend work that is:

- visually polished
- calm and premium
- trustworthy
- production-grade
- performant
- accessible
- consistent with the product

This product is a budgeting application.
It must not feel noisy, gimmicky, childish, chaotic, theatrical, or “AI-generated”.

---

## 1. Product UI Intent

The UI must feel:

- calm
- premium
- clear
- intentional
- trustworthy
- simple, but not dull

This is **not** a marketing landing page generator.
This is a financial product.

That means:

- clarity beats spectacle
- hierarchy beats decoration
- trust beats trendiness
- usability beats cleverness
- consistency beats novelty

Premium does **not** mean flashy.
Premium means controlled, refined, and well-crafted.

---

## 2. Default Design Direction

Unless the user explicitly asks for something else, follow this direction:

### Nordic Calm Premium

Use a visual style that feels:

- clean
- spacious
- modern
- restrained
- slightly editorial
- soft but confident

Prefer:

- strong typography hierarchy
- excellent spacing
- soft surfaces
- subtle layering
- restrained color accents
- deliberate motion
- crisp data presentation

Avoid:

- loud gradients everywhere
- startup-style purple/blue AI slop
- overly playful illustrations
- excessive glassmorphism
- gimmicky dashboards
- over-animated interactions
- cluttered cards
- visual noise
- “agency demo” behavior inside product screens

---

## 3. Existing Palette, Tokens, and Theme Rules

The repository already has an established visual system.
Agents must respect it.

### 3.1 Existing tokens are the source of truth

Use the existing token system before inventing new styling.

Important existing sources include:

- shadcn tokens (`--background`, `--foreground`, `--card`, `--border`, etc.)
- eBudget tokens (`--eb-*`)
- wizard tokens (`--wizard-*`)
- existing utility classes such as:
  - `shadow-eb`
  - `money`
  - `money-muted`
  - `bg-wizard-overlay`
  - `ring-eb-danger`

Do **not** introduce a parallel color system without a strong reason.

### 3.2 Respect the established eBudget palette

The application already uses a branded blue-based shell/surface system and existing gradients.
Do not randomly replace that with another visual language.

Prefer existing palette semantics:

- `--eb-shell`, `--eb-shell-2`, `--eb-shell-3`
- `--eb-surface`, `--eb-surface-accent`
- `--eb-stroke`, `--eb-stroke-strong`
- `--eb-text`, `--eb-muted`
- `--eb-accent`, `--eb-accent-soft`
- `--eb-danger`
- `--eb-shadow`

The palette should feel cohesive across screens.
Do not inject random new accent colors just to make something “look designed”.

### 3.3 Do not fight the global background

The `body` already uses a branded gradient background.

Do not override global application background behavior casually.
Do not introduce full-screen competing backgrounds unless the page truly requires a special shell.

By default:

- let the existing app shell and gradient do their job
- build refined surfaces on top of it
- use cards, sections, overlays, and panels to create clarity

### 3.4 Typography must respect reality

The app already uses `font-inter` globally.

Do **not** follow any external skill rule that bans Inter or demands random font swaps.
For this repository:

- default to the existing font system
- improve hierarchy through size, weight, spacing, rhythm, and contrast
- only introduce different fonts if the user explicitly asks for branding or marketing work

Typography should feel refined through usage, not through random replacement.

### 3.5 Wizard styling is contextual

Wizard tokens and wizard overlays should be used only where they make sense:

- onboarding
- wizard flows
- modal-like guided experiences
- branded overlay states

Do not spread wizard-specific styling across unrelated application UI unless the screen is clearly part of that experience.

---

## 4. Core Frontend Rules

### 4.1 Respect existing architecture

Before building anything:

- inspect nearby pages/components
- reuse existing primitives where reasonable
- match folder structure
- match naming conventions
- match composition style
- match existing state/query/form patterns

Do not introduce a totally different design system inside one feature.

### 4.2 Prefer small reusable components

Favor:

- focused presentational components
- typed props
- local composition
- clear boundaries
- reusable section components when repetition is real

Avoid:

- giant monolithic page files
- deeply tangled conditionals
- abstracting too early
- “smart” generic UI helpers with unclear ownership

### 4.3 Financial UI must stay readable

Money is the main content.

Prioritize:

- readable totals
- strong contrast between primary and secondary values
- clear positive/negative semantics
- consistent number alignment where needed
- obvious labels
- good empty states
- obvious read-only states

Do not bury numbers under decoration.

### 4.4 Read-only vs editable must be visually obvious

This app has budget month lifecycle rules.

When implementing UI:

- reflect editability clearly
- disable interactions intentionally
- show explanatory copy where needed
- avoid fake affordances for disabled actions

Never imply editing is available when it is not.

---

## 5. Visual Quality Standard

Every UI implementation should show deliberate design thinking.

Agents must not output default-looking, generic, template-like layouts.

Distinctive in this repository means:

- stronger hierarchy than average
- more intentional spacing than average
- more refined typography than average
- better interaction polish than average
- cleaner visual rhythm than average
- less clutter than average

The memorable thing should be:

- calm confidence
- elegant information display
- premium restraint

Not visual chaos.

### 5.1 Avoid generic frontend defaults

Avoid output such as:

- weak typography hierarchy
- random gray borders on everything
- muddy shadows
- overcrowded card grids
- repetitive template dashboards
- decorative gradients without purpose
- generic SaaS UI patterns with no product character

### 5.2 Typography

Typography is one of the main quality levers.

Prefer:

- strong scale contrast
- readable body text
- disciplined line lengths
- deliberate weight usage
- restrained uppercase usage
- clean numeric emphasis
- strong title/value/label separation

Avoid:

- random font mixing
- weak hierarchy
- giant headings without purpose
- tiny low-contrast helper text
- typography used as decoration without function

### 5.3 Layout and spacing

Spacing must feel intentional.

Prefer:

- generous whitespace
- stable rhythm
- clean grouping
- balanced card density
- clear section separation
- predictable alignment

Avoid:

- cramped layouts
- inconsistent paddings
- arbitrary gaps
- too many nested containers
- “dashboard soup”

### 5.4 Color

Use restrained palettes.

Default direction:

- neutral/light surface treatment on top of the existing shell
- strong readable text
- one or two controlled accents
- semantic colors only where meaningful
- existing brand tokens first

Avoid:

- random rainbow accents
- muddy low-contrast text
- loud gradients as default
- overuse of bright colors for non-critical UI
- inventing new palette semantics when existing tokens already solve the problem

### 5.5 Surfaces

Prefer surfaces that feel refined:

- subtle borders
- soft shadows
- restrained layering
- clear hover/focus states
- careful radius usage

Avoid:

- overblown shadows
- heavy blur everywhere
- fake “premium” effects without purpose
- too many competing card treatments

When possible, use the repository’s existing surface/shadow language instead of inventing new ones.

---

## 6. Motion Rules

Motion should improve clarity and feel polished.
It must never damage performance or trust.

### 6.1 Motion philosophy

Use motion to support:

- entrance hierarchy
- state transitions
- feedback
- drawer/modal clarity
- hover/focus quality
- perceived smoothness

Avoid motion that feels decorative for its own sake.

### 6.2 Preferred motion style

Default motion should be:

- subtle
- smooth
- brief
- confident
- low-friction

Good examples:

- fade + small translate
- staggered reveal for grouped content
- smooth drawer transitions
- gentle hover lift
- opacity/transform-based feedback

Bad examples:

- bouncing dashboards
- over-rotating elements
- long theatrical intros
- scroll hijacking inside product UI
- flashy cursor gimmicks in application screens
- magnetic buttons
- cinematic app-shell transitions

### 6.3 Performance rules

Animate only:

- `transform`
- `opacity`

Avoid animating:

- `width`
- `height`
- `top`
- `left`
- `margin`
- layout-heavy properties

Use `will-change` sparingly.

Respect:

- `prefers-reduced-motion`
- touch devices
- low-noise interactions for financial workflows

### 6.4 Motion quality standard

When transitions are used, prefer motion that feels refined rather than default.

Prefer:

- subtle custom easing when it improves feel
- short-to-medium durations
- grouped reveals only when they improve hierarchy
- polished overlay and modal entry/exit

Do not add motion simply because it is available.

---

## 7. Premium UI Does Not Mean Marketing-Site Behavior

This is important.

For this repository, do **not** default to Awwwards-style behavior in application UI.

That means avoid by default:

- preloaders
- scroll-jacked storytelling
- custom cursors
- pinned cinematic hero sections
- giant reveal sequences
- magnetic buttons
- decorative 3D effects
- over-styled glass overlays
- dramatic asymmetrical experiments in core workflows

Those can be appropriate for:

- landing pages
- marketing sites
- portfolio pages
- promo experiences

They are usually **wrong** for:

- dashboards
- forms
- budgeting flows
- editors
- settings
- financial summaries

If the user explicitly asks for a landing page or promotional site, those techniques may be used selectively.

---

## 8. Frontend Design Modes

When the user asks for UI work, choose one of these modes consciously.

### 8.1 Application UI mode (default)

Use for:

- dashboards
- forms
- editors
- tables
- account pages
- budgeting workflows
- settings
- modals/drawers

Priorities:

- clarity
- trust
- usability
- restrained polish
- compositional cleanliness

### 8.2 Marketing / landing page mode

Use only when explicitly appropriate.

Priorities:

- stronger visual identity
- more dramatic typography
- richer motion
- stronger layout experimentation
- storytelling sections

Still keep performance and accessibility in check.

### 8.3 Component refinement mode

Use when improving existing screens/components.

Priorities:

- preserve structure
- improve hierarchy
- improve spacing
- improve readability
- improve interaction quality
- avoid unnecessary rewrites

### 8.4 Visual escalation rule

Agents may increase visual expressiveness only when the feature context supports it.

Allowed stronger visual exploration:

- landing pages
- marketing surfaces
- onboarding splash sections
- empty states where brand expression adds value
- isolated promotional modules

Default restraint required for:

- dashboards
- budgeting summaries
- month editors
- forms
- settings
- transaction or expense workflows
- read-only financial views

For application UI, always bias toward clarity, trust, and maintainability over visual novelty.

---

## 9. Frontend Implementation Guidance

### 9.1 React / TypeScript

Write React that is:

- typed
- explicit
- composable
- easy to review
- easy to extend

Prefer:

- well-named props
- small view helpers where justified
- derived state over duplicated state
- explicit loading/error/empty states

Avoid:

- `any`
- fragile effect chains
- hidden mutations
- unclear prop contracts
- premature abstraction

### 9.2 Tailwind usage

Tailwind should be used with discipline.

Prefer:

- readable class composition
- extracted components when markup repeats
- `cn(...)` only when it improves clarity
- stable design tokens/patterns when available

Avoid:

- unreadable class overload
- arbitrary values everywhere
- inconsistent spacing scales
- one-off styling chaos

### 9.3 Existing UI primitives first

Before inventing new primitives:

- inspect current button patterns
- inspect current input/form field patterns
- inspect current card/surface patterns
- inspect current drawer/modal patterns

Reuse before inventing.

### 9.4 Empty, loading, and error states are mandatory

Do not build only the happy path.

Every relevant UI should consider:

- loading
- empty state
- failure state
- partial data
- read-only state
- disabled state

### 9.5 Use the existing token language in implementation

When styling UI, prefer implementation that composes with existing tokens and utilities.

Examples of good direction:

- existing semantic text/surface classes
- eBudget token-backed colors
- established shadows such as `shadow-eb`
- money-related utility styles where appropriate
- existing border/ring semantics

Avoid “special snowflake” styling that bypasses the current visual system unless a real design need exists.

---

## 10. Anti-Generic Rule

Do not output frontend that looks like a generic AI-generated dashboard.

Before finalizing, check:

- does the hierarchy feel deliberate?
- does the spacing feel calm and consistent?
- are surfaces refined instead of default?
- are money values clearly prioritized?
- does the interaction design feel polished but restrained?
- does this fit a financial product rather than a startup template?
- does it work with the existing eBudget palette and shell?

If not, refine the implementation before finishing.

---

## 11. When Asked To “Make It Better”

If the user asks to improve or polish UI, default to this order:

1. improve hierarchy
2. improve spacing
3. improve typography
4. improve surface treatment
5. improve readability of data
6. improve interaction polish
7. only then consider stronger visual styling

Do not jump straight to adding effects.

---

## 12. Delivery Standard

When producing frontend code, aim for:

- production-grade implementation
- visual refinement
- consistency with current product tone
- minimal unnecessary churn
- maintainable code
- clear state handling
- accessible interaction patterns

If forced to choose, choose the version that is:

- simpler
- calmer
- clearer
- easier to maintain

That is usually the right answer for this product.
