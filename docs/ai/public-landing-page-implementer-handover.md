# Public Landing Page Refactor - Implementer Handover

Date: 2026-06-08

Reference design: `/Users/linussteen/Downloads/eBudget Marketing Kit (offline)(2).html`

Primary investigation: `docs/ai/public-landing-page-refactor-investigation.md`

## TLDR

Implement this as one focused frontend PR:

- Refactor the public landing page to the approved draft 3 structure.
- Refactor the public menu back to the cloud-menu direction.
- Keep About and FAQ as dedicated pages.
- Keep `Skaffa eBudget -> /registration`.
- Keep `Logga in -> /login`.
- Keep language selection visible and functional.
- Add a minimal footer with `Integritet` / `Villkor` as inert non-link text placeholders; real legal links/content are a later PR.

No backend changes.

## Locked Decisions

These decisions are already taken:

| Decision | Outcome |
| --- | --- |
| PR count | One implementation PR for landing + public menu. Legal page content can be a later PR. |
| Hero secondary CTA | `Logga in` -> `/login`. Do not use FAQ as hero secondary CTA. |
| Mobile menu order | Keep CTA-first mobile order. Do not blindly follow prototype order. |
| FAQ contact block | Leave existing FAQ contact behavior alone. Do not add contact to landing. |
| Mascot | Use existing main bird only. No new mascot personas. |
| i18n | Add Swedish, English, and Estonian keys. Direct translations are acceptable for the PR. |
| Legal links | Render `Integritet` / `Villkor` as inert non-link text placeholders (no `<a>`/`Link`, no `/integritet`, `/villkor`, or `/data-policy` href). Real links land in the legal-content PR. |

## Hard Scope

### 1. Landing Page

Replace the current thin landing page in:

- `Frontend/src/Pages/public/Home/DesktopHomePage.tsx`
- `Frontend/src/utils/i18n/pages/public/HomePage.i18n.ts`

Target structure:

1. Hero
2. Benefit/principle row
3. Short "Så funkar eBudget" preview
4. About teaser
5. FAQ teaser
6. Final CTA
7. Minimal footer

The landing page must not render:

- The full About page.
- The full FAQ accordion.
- Any public contact link.
- New mascot personas.

### 2. Public Menu Refactor

This task includes the menu. Full stop. Going back to a cloud menu is non-negotiable. Leaving `kind: "trim"` is not acceptable and will be rejected at review.

The current public desktop header uses the cloud system, but the `public` preset is using `kind: "trim"` in:

- `Frontend/src/components/organisms/Menu/hooks/header.config.ts`

Required end state:

- The `public` preset in `header.config.ts` MUST set `clouds.kind: "backdrop"`. `"trim"` is rejected.
- The desktop public header MUST render the full cloud menu via `CloudBackdrop` and `Frontend/src/assets/Components/Menu/CloudMenu_1440.svg`. `CloudTrim` is rejected for the public preset.
- Do not introduce a new menu shell or a parallel SVG. Reuse `CloudBackdrop` / `CloudMenu_1440.svg`.
- The `app` (authenticated) preset MUST remain unchanged in this PR.

Relevant existing files:

- `Frontend/src/components/organisms/Menu/PublicHeader.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/DesktopPublicMenu.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/HeaderFrame.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/CloudBackdrop.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/CloudTrim.tsx`
- `Frontend/src/assets/Components/Menu/CloudMenu_1440.svg`

Implementation direction:

- Keep the existing public header architecture (`PublicHeader` / `DesktopPublicMenu` / `HeaderFrame`).
- Flip the `public` preset to `kind: "backdrop"` and tune `opacity` / `translateY` / `heightClass` so the cloud reads as a proper menu, not chrome trim.
- Header height may grow (e.g. `h-[68px]`) if needed to host the backdrop without crowding the pill nav.
- Keep the header content minimal:
  - Left: logo / wordmark -> `/`
  - Center: `Om oss` -> `/about-us`, `Vanliga frågor` -> `/faq`
  - Right: `Skaffa eBudget` -> `/registration`, `Logga in` -> `/login`, language selector
- Do not add `Home`.
- Do not add `Kontakt`.
- Do not break the app/authenticated header.

### 3. Mobile Menu

Keep CTA-first mobile order:

1. `Skaffa eBudget`
2. `Logga in`
3. `Vanliga frågor`
4. `Om oss`
5. Language selector

Relevant file:

- `Frontend/src/components/organisms/Menu/mainMenu/mobile/PublicMobileMenu.tsx`

Do not introduce a dramatic full-screen mobile takeover. Current slide-down panel is acceptable if it stays clean and has no horizontal overflow.

### 4. Footer

Add a minimal footer for the landing surface.

Recommended options:

- If footer is landing-only: implement inside `DesktopHomePage.tsx` or landing section components.
- If footer should later be shared: add `PublicFooter` and wire it through `PublicLayout`.

Footer content:

- eBudget/copyright.
- `Integritet`.
- `Villkor`.

Legal-link rule (binding — same rule appears in the reviewer handover):

- The legal page content is a later PR.
- Do not invent privacy/terms legal copy.
- This PR MUST NOT render `<a>` / `Link` elements pointing at `/integritet`, `/villkor`, `/data-policy`, or any other legal route. Shipping anchors that 404 is rejected.
- Render `Integritet` and `Villkor` as inert text placeholders (plain `<span>` styled like the surrounding footer text). A one-line code comment must mark them as placeholders pending the legal-content PR.
- A future PR may upgrade these placeholders to real `Link` elements once the routes and approved copy land. Adding a placeholder route in this PR is out of scope.

## Copy Rules

Use:

- `budgetering`
- `privatekonomi`
- `månadsplanering`

Avoid:

- `bokföring`

Required teaser copy:

About teaser:

- Title: `Byggd för lugnare privatekonomi`
- Text: `eBudget är gjort för hushåll som vill planera månaden utan kalkylblad, stress eller ekonomijargong.`
- CTA: `Läs mer om eBudget`

FAQ teaser:

- Title: `Frågor innan du börjar?`
- Text: `Se svar om säkerhet, pris, export och hur budgeteringen fungerar.`
- CTA: `Till vanliga frågor`

## Existing Routes To Use

Use route constants from:

- `Frontend/src/routes/appRoutes.ts`

Existing public routes:

| Purpose | Route |
| --- | --- |
| Landing | `/` |
| Signup/get-started | `/registration` |
| Login | `/login` |
| About | `/about-us` |
| FAQ | `/faq` |
| How it works | `/how-it-works` |

Do not copy the prototype's `get -> login` handler. That is wrong for production.

## Component Reuse

Prefer these existing components:

- `PublicLayout`
- `PublicHeader`
- `DesktopPublicMenu`
- `PublicMobileMenu`
- `HeaderFrame`
- `HeaderPillNav`
- `HeaderRightActions`
- `LanguagePill`
- `PageContainer`
- `ContentWrapperV2`
- `SurfaceCard`
- `InfoCard`
- `Pill`
- `CtaLink`
- `SecondaryLink`
- `ActionLink`
- `Mascot`

Do not create a second public header, second language selector, or parallel design system.

## Suggested File Impact

Likely edits:

- `Frontend/src/Pages/public/Home/DesktopHomePage.tsx`
- `Frontend/src/utils/i18n/pages/public/HomePage.i18n.ts`
- `Frontend/src/components/organisms/Menu/hooks/header.config.ts`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/DesktopPublicMenu.tsx`

Possible edits:

- `Frontend/src/Pages/public/Home/HomePage.tsx`
- `Frontend/src/layout/PublicLayout.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/mobile/PublicMobileMenu.tsx`

Out of scope:

- `Frontend/src/routes/appRoutes.ts`
- `Frontend/src/layout/AppRoutes.tsx`

Do not add legal placeholder routes in this PR. Legal routes and approved legal copy land together in the legal-content PR.

## Validation Plan

Run narrow frontend validation:

1. `npm run build` from `Frontend/`.
2. A focused Playwright/manual browser pass at desktop and mobile widths.

Minimum behavior to verify:

- Landing renders all target sections.
- Public desktop menu uses the cloud-menu treatment.
- Logo routes to `/`.
- `Om oss` routes to `/about-us`.
- `Vanliga frågor` routes to `/faq`.
- `Skaffa eBudget` routes to `/registration`.
- `Logga in` routes to `/login`.
- Language selector opens and changes visible copy.
- Mobile menu exposes CTA, login, FAQ, About, language selector.
- About teaser links to `/about-us`.
- FAQ teaser links to `/faq`.
- Landing does not include full FAQ accordion.
- Landing does not include full About content.
- Landing has no contact link.
- No horizontal overflow.

## Definition Of Done

The PR is done when:

- Landing matches draft 3 direction functionally and structurally.
- Public menu is back to the cloud-menu direction.
- CTA routing is correct and distinct.
- Language selector still works on desktop and mobile.
- About and FAQ remain dedicated pages.
- Footer is minimal and does not invent legal content.
- No backend changes were introduced.
- Build passes.
- Browser/manual verification covers desktop and mobile.
