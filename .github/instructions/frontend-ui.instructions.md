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
It must not feel noisy, gimmicky, childish, chaotic, or “AI-generated”.

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

---

## 3. Core Frontend Rules

### 3.1 Respect existing architecture

Before building anything:

- inspect nearby pages/components
- reuse existing primitives where reasonable
- match folder structure
- match naming conventions
- match composition style
- match existing state/query/form patterns

Do not introduce a totally different design system inside one feature.

### 3.2 Prefer small reusable components

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

### 3.3 Financial UI must stay readable

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

### 3.4 Read-only vs editable must be visually obvious

This app has budget month lifecycle rules.

When implementing UI:

- reflect editability clearly
- disable interactions intentionally
- show explanatory copy where needed
- avoid fake affordances for disabled actions

Never imply editing is available when it is not.

---

## 4. Visual Quality Standard

Every UI implementation should show deliberate design thinking.

Agents must not output default-looking, generic, template-like layouts.

### 4.1 Typography

Typography is one of the main quality levers.

Prefer:

- strong scale contrast
- readable body text
- disciplined line lengths
- deliberate weight usage
- restrained uppercase usage
- clean numeric emphasis

Use fluid sizing when appropriate, but do not overdo it.

Avoid:

- random font mixing
- weak hierarchy
- giant headings without purpose
- tiny low-contrast helper text
- typography used as decoration without function

### 4.2 Layout and spacing

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

### 4.3 Color

Use restrained palettes.

Default direction:

- neutral base
- soft surface contrast
- strong readable text
- one or two controlled accents
- semantic colors only where meaningful

Avoid:

- random rainbow accents
- muddy low-contrast text
- loud gradients as default
- overuse of bright colors for non-critical UI

### 4.4 Surfaces

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

---

## 5. Motion Rules

Motion should improve clarity and feel polished.
It must never damage performance or trust.

### 5.1 Motion philosophy

Use motion to support:

- entrance hierarchy
- state transitions
- feedback
- drawer/modal clarity
- hover/focus quality
- perceived smoothness

Avoid motion that feels decorative for its own sake.

### 5.2 Preferred motion style

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

### 5.3 Performance rules

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

---

## 6. Premium UI Does Not Mean Marketing-Site Behavior

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
- mega-menu theatrics

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

## 7. Frontend Design Modes

When the user asks for UI work, choose one of these modes consciously.

### 7.1 Application UI mode (default)

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

### 7.2 Marketing / landing page mode

Use only when explicitly appropriate.

Priorities:

- stronger visual identity
- more dramatic typography
- richer motion
- stronger layout experimentation
- storytelling sections

Still keep performance and accessibility in check.

### 7.3 Component refinement mode

Use when improving existing screens/components.

Priorities:

- preserve structure
- improve hierarchy
- improve spacing
- improve readability
- improve interaction quality
- avoid unnecessary rewrites

---

## 8. Frontend Implementation Guidance

### 8.1 React / TypeScript

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

### 8.2 Tailwind usage

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

### 8.3 Existing UI primitives first

Before inventing new primitives:

- inspect current button patterns
- inspect current input/form field patterns
- inspect current card/surface patterns
- inspect current drawer/modal patterns

Reuse before inventing.

### 8.4 Empty, loading, and error states are mandatory

Do not build only the happy path.

Every relevant UI should consider:

- loading
- empty state
- failure state
- partial data
- read-only state
- disabled state

---

## 9. What “Distinctive” Means In This Repo

Distinctive does **not** mean weird.

In this repository, distinctive means:

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

---

## 10. When Asked To “Make It Better”

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

## 11. Delivery Standard

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
