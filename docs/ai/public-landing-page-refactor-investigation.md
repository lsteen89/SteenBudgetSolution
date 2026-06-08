# Public Landing Page Refactor Investigation

Date: 2026-06-08

Reference prototype: `/Users/linussteen/Downloads/eBudget Marketing Kit (offline)(2).html`

## Current-State Summary

The public frontend already has a shared public shell:

- Routing is centralized in `Frontend/src/layout/AppRoutes.tsx`.
- Route constants live in `Frontend/src/routes/appRoutes.ts`.
- Public pages are wrapped by `Frontend/src/layout/PublicLayout.tsx`, which renders `PublicHeader` above an `Outlet`.
- The public header is responsive: `DesktopPublicMenu` from `xl` up, `PublicMobileMenu` below `xl`.
- Public copy uses the local i18n dictionary pattern (`useAppLocale`, `tDict`, `*.i18n.ts`) rather than global i18next.

Current landing page is much thinner than draft 3:

- One hero card.
- Primary CTA to `/registration`.
- Secondary CTA to `/faq`.
- Three small feature bullets.
- Privacy note with a broken `/data-policy` link.
- Large `MainPageBird` mascot.
- No landing-specific footer.
- No About teaser.
- No FAQ teaser.
- No short "How it works" landing preview.
- No final CTA band.

Important current behavior:

- Desktop `Skaffa eBudget` and `Logga in` are already distinct: `/registration` and `/login`.
- Mobile unauthenticated menu exposes `Skaffa eBudget`, `Logga in`, `Vanliga frågor`, `Om oss`, plus language selector in the drawer footer.
- Language selector supports Swedish, English, and Estonian, persists in `localStorage` and cookie key `eb_locale`, and updates subscribed React views.
- About and FAQ already exist as dedicated public pages.
- FAQ page currently contains a public contact mailto block. The new landing should not add a contact link; do not change the existing FAQ contact block unless product scope expands.

## Public Route Map

| Current route | Purpose | Component/page | Keep/change/remove | Notes |
| --- | --- | --- | --- | --- |
| `/` | Public landing | `Frontend/src/Pages/public/Home/HomePage.tsx` -> `DesktopHomePage.tsx` | Change | Replace landing content with draft 3 structure. Keep route. |
| `/about-us` | Dedicated About page | `Frontend/src/Pages/public/info/AboutUs.tsx` | Keep | Landing should preview and link here, not duplicate full About content. |
| `/faq` | Dedicated FAQ page | `Frontend/src/Pages/public/info/Faq.tsx` | Keep | Landing should preview and link here, not duplicate accordion. Existing FAQ has contact mailto. |
| `/how-it-works` | Public visual guide | `Frontend/src/Pages/public/info/HowItWorksPage.tsx` | Keep | Can support "Hur det fungerar" CTA, but landing also needs a short preview section. |
| `/login` | Login | `Frontend/src/Pages/public/auth/LoginPage.tsx` | Keep | Uses public shell. Redirects authenticated users after token inspection. |
| `/registration` | Signup/get-started | `Frontend/src/Pages/public/user/Registration.tsx` | Keep | Correct target for `Skaffa eBudget`. Registers, applies auth, then navigates post-auth. |
| `/forgot-password` | Password reset request | `Frontend/src/Pages/public/auth/ForgotPasswordPage.tsx` | Keep | Existing page contains `/contact` help link, but `/contact` is not routed. Not landing scope. |
| `/reset-password` | Password reset completion | `Frontend/src/Pages/public/auth/PasswordResetPage.tsx` | Keep | Existing public auth route. |
| `/email-verification-recovery` | Verification recovery | `Frontend/src/Pages/public/auth/EmailVerificationRecoveryPage.tsx` | Keep | Existing public auth route. |
| `/email-confirmation` | Email confirmation | `Frontend/src/Pages/public/auth/EmailConfirmationPage.tsx` | Keep | Defined under protected onboarding flow, not public layout. |
| `/dashboard/*` | Authenticated app | Private pages under `AuthedLayout` | Keep | Not landing scope. |
| `*` | 404 | `Frontend/src/Pages/public/info/NotFoundPage.tsx` | Keep | Current fallback. Has a `/contact` branch if no history, but `/contact` is not routed. |
| `/data-policy` | Intended privacy/data policy link | None | Remove link behavior | Current landing links here; route constant and page do not exist. Future PR owns legal routes/content. |
| `/privacy` / `/integritet` | Privacy | None | Do not add in this PR | Render `Integritet` as inert footer text only. No route, no `Link`, no fake legal copy. |
| `/terms` / `/villkor` | Terms | None | Do not add in this PR | Render `Villkor` as inert footer text only. No route, no `Link`, no fake legal copy. |
| `/contact` | Contact | None | Do not add to landing | Existing not-found/forgot-password references exist, but no public contact route. Target says no public contact link for landing. |

## Current Landing Behavior

| Area | Current behavior | Source |
| --- | --- | --- |
| Header | Shared `PublicHeader`; desktop has logo, About, FAQ, registration, login, language selector. | `Frontend/src/components/organisms/Menu/PublicHeader.tsx`, `DesktopPublicMenu.tsx`, `HeaderRightActions.tsx` |
| Mobile header | Top bar plus slide-down panel. Unauthenticated items: registration, login, FAQ, About. Language selector in footer. | `Frontend/src/components/organisms/Menu/mainMenu/mobile/PublicMobileMenu.tsx` |
| Hero | Card with kicker/title/body, `Skaffa eBudget`, `Vanliga frågor`, 3 feature bullets, privacy note. | `Frontend/src/Pages/public/Home/DesktopHomePage.tsx` |
| CTA behavior | Primary -> `/registration`; secondary -> `/faq`; privacy note -> `/data-policy` broken route. | `DesktopHomePage.tsx` |
| Mascot/image | Uses `MainPageBird.png`. Header uses `MobileBird.png`. | `Frontend/src/assets/Images/` |
| Footer | No public footer in `PublicLayout` or landing. | `Frontend/src/layout/PublicLayout.tsx` |
| Copy | `homeDict` with `sv`, `en`, `et`. | `Frontend/src/utils/i18n/pages/public/HomePage.i18n.ts` |
| Mobile landing layout | Despite `DesktopHomePage` name, hero uses responsive grid/buttons/features. Needs browser verification after refactor. | `DesktopHomePage.tsx` |

## Target-State Summary

Draft 3 requires the landing page to become a calm marketing overview, not a duplicate of About/FAQ.

Target landing order:

1. Hero
2. Benefit/principle row
3. Short "Så funkar eBudget" preview
4. About teaser
5. FAQ teaser
6. Final CTA
7. Minimal footer

Non-negotiables:

- Keep About as a dedicated page.
- Keep FAQ as a dedicated page.
- Landing previews About/FAQ only.
- Header stays minimal.
- Language selector remains visible and functional.
- `Skaffa eBudget` remains primary and routes to signup/get-started.
- `Logga in` remains secondary and routes to login.
- No public contact link on the landing.
- No new mascot personas.
- Use `budgetering`, `privatekonomi`, `månadsplanering`.
- Avoid `bokföring`.

Prototype warning:

- The prototype's central nav handler maps `get` to `login` while commenting `Skaffa eBudget -> signup/get-started`. Do not copy that behavior. The production app already has `/registration`; use it.

## Target Section Table

| Target section | Purpose | Required content | Existing support? | Gap |
| --- | --- | --- | --- | --- |
| Hero | Explain product fast and route to conversion/login/guide | eBudget positioning, primary `Skaffa eBudget`, secondary login or guide CTA, controlled main bird | Partial | Current hero exists but copy/structure is not draft 3 and secondary CTA goes to FAQ. |
| Benefit/principle row | Communicate core value quickly | 3 calm benefits/principles using target vocabulary | Partial | Current 3 bullets are inside hero and too thin. Needs row section. |
| "Så funkar eBudget" preview | Short preview of monthly planning flow | 3-step or compact guide; optionally link to `/how-it-works` | Partial | Full `/how-it-works` page exists; no landing preview section. |
| About teaser | Preview About without duplicating | Title `Byggd för lugnare privatekonomi`; body; CTA `Läs mer om eBudget` -> `/about-us` | Partial | About page exists; landing teaser missing; i18n keys missing. |
| FAQ teaser | Preview FAQ without accordion | Title `Frågor innan du börjar?`; body; CTA `Till vanliga frågor` -> `/faq` | Partial | FAQ page exists; landing teaser missing; i18n keys missing. |
| Final CTA | Last conversion nudge | Primary `Skaffa eBudget`, secondary `Logga in` | Partial | Header has CTAs; landing final CTA missing. |
| Minimal footer | Quiet legal placeholders without contact | Logo/copyright, inert `Integritet` / `Villkor` text placeholders | No | No public footer component; legal routes are intentionally out of scope. |

## Gap Analysis

| Area | Current behavior | Target behavior | Gap | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Landing structure | Single hero card with bullets and mascot. | 7-section draft 3 landing. | Major content/layout gap. | Medium visual regression risk. | Replace landing body in focused PR using existing public components/tokens. |
| Header desktop | Logo, About, FAQ, registration, login, language selector — but `public` preset uses `clouds.kind: "trim"` (thin cloud trim only). | Same items, rendered with the full cloud-menu treatment via `CloudBackdrop` + `CloudMenu_1440.svg`. | Cloud treatment is the gap — items are fine; `trim` is rejected. | Medium if implementer treats the menu as out-of-scope. | Menu refactor is in scope for this PR. Flip `public` preset to `kind: "backdrop"`, reuse `CloudBackdrop` / `CloudMenu_1440.svg`, leave `app` preset untouched. See implementer handover §2 for binding requirements. |
| Header mobile | Drawer includes registration, login, FAQ, About, language selector. | Drawer should contain About, FAQ, registration, login, language selector. | Order differs from target. Functionally OK. | Low. | Reorder mobile items to match target if product wants exact menu order. |
| Signup vs login | Distinct `/registration` and `/login`. | Distinct behaviors. | None in production. Prototype has misleading `get -> login`. | High if prototype handler is copied. | Keep `Skaffa eBudget` on `appRoutes.registration`. |
| About page | Dedicated page with hero, values, product section. | Keep dedicated page. Landing teaser only. | Landing teaser missing. | Low. | Add teaser to landing, do not rebuild About. |
| FAQ page | Dedicated page with accordion and contact mailto callout. | Keep dedicated page. Landing teaser only. | Landing teaser missing. Existing FAQ contact conflicts only if target applies globally. | Medium product ambiguity. | Do not add contact to landing. Leave FAQ contact unless product explicitly removes public contact everywhere. |
| Language selector | `LanguagePill`, visible desktop, visible mobile drawer footer, persists. | Visible and functional, label like `SV` with caret. | Mostly none. | Low. | Reuse `LanguagePill`; test desktop and mobile. |
| Public footer | None. | Minimal footer with copyright + `Integritet` / `Villkor`. | Missing component, missing legal routes. | Medium because legal copy cannot be invented safely. | Render `Integritet` / `Villkor` as inert non-link text placeholders (no `<a>`/`Link`, no `/integritet`, `/villkor`, or `/data-policy` href). Real legal routes + approved copy land in a follow-up PR. See implementer/reviewer handovers for the binding rule. |
| Privacy route | Landing links to `/data-policy`, but route missing. | No privacy route/link in this PR; inert `Integritet` footer text only. | Current broken link must be removed. | Medium. | Do not add a route. Do not render an anchor. Legal route/content lands in a follow-up PR. |
| Terms route | No route/link. | No terms route/link in this PR; inert `Villkor` footer text only. | Footer label missing. | Low. | Do not add a route. Do not render an anchor. Legal route/content lands in a follow-up PR. |
| Public contact | FAQ/forgot/404 reference contact; no route. | No public contact link on landing. | Landing can comply; wider app has existing unresolved contact references. | Low for landing, medium globally. | Do not add landing contact. Track existing contact-route debt separately. |
| Copy/i18n | Public copy dictionaries exist for `sv/en/et`. | New visible copy should follow existing i18n pattern. | Missing new landing keys in all locales. | Medium. | Add `HomePage.i18n.ts` keys for all locales; no hardcoded Swedish in component. |
| Assets/mascot | Many bird assets; landing uses `MainPageBird`, FAQ uses `FaqBird`, About uses `GuideBirdHappy`. | Main bird can support hero; avoid multiple personas/detective-style FAQ bird on landing. | Need disciplined asset choice. | Low. | Use existing brand bird in hero; avoid adding new personas/assets. |
| Backend | No backend dependency for landing refactor. | No backend changes unless justified. | None. | Low. | No backend changes. |

## Route And CTA Map

| CTA | Current behavior | Target behavior | Gap | Recommendation |
| --- | --- | --- | --- | --- |
| Logo | Desktop/mobile logo routes to `/` when unauthenticated. Authed mobile routes to `/dashboard`. | Landing page. | Acceptable; authenticated behavior is app-specific. | Keep. |
| `Skaffa eBudget` header | `/registration`. | Signup/get-started. | None. | Keep `appRoutes.registration`. |
| `Logga in` header | `/login`. | Login. | None. | Keep `appRoutes.login`. |
| Hero primary | `/registration`. | Signup/get-started. | None. | Keep. |
| Hero secondary | `/faq`. | `Logga in` -> `/login`. | Current does not match agreed CTA decision. | Make hero secondary `Logga in`; put `Hur det fungerar` in the lower preview section, with optional `/how-it-works` deeper link. |
| `Hur det fungerar` | Existing About and FAQ can link to `/how-it-works`; no landing section. | Lower landing preview section or guide link, not hero secondary. | Landing section missing. | Add preview with optional link to existing guide. |
| `Läs mer om eBudget` | Missing on landing. | `/about-us`. | Missing. | Add About teaser CTA. |
| `Till vanliga frågor` | Missing on landing; hero secondary goes to `/faq`. | `/faq`. | Missing teaser. | Add FAQ teaser CTA. |
| Final CTA primary | Missing. | `/registration`. | Missing. | Add final CTA band. |
| Final CTA secondary | Missing. | `/login`. | Missing. | Add final CTA band. |
| `Integritet` | Current `/data-policy` link exists but no route. | Inert footer text placeholder. | Current broken link must be removed. | Render text only; no `<a>` / `Link` / href. |
| `Villkor` | Missing. | Inert footer text placeholder. | Footer label missing. | Render text only; no `<a>` / `Link` / href. |
| Language selector | Opens locale menu; sets `eb_locale`. | Existing language switch behavior. | None. | Reuse and test. |

## Existing About Page

- Route: `/about-us`.
- Component: `Frontend/src/Pages/public/info/AboutUs.tsx`.
- Copy source: `Frontend/src/utils/i18n/pages/public/AboutUs.i18n.ts`.
- Layout: `PageContainer`, `ContentWrapperV2`, `SurfaceCard`, `InfoCard`, `Pill`.
- Header/footer behavior: shared public header; no public footer.
- Mascot: imports `GuideBirdHappy.png`, not `AboutUsBird.png`.
- Fit with new shell: structurally compatible with public shell; no need to rebuild.

Landing teaser recommendation:

- Title: `Byggd för lugnare privatekonomi`.
- Text: `eBudget är gjort för hushåll som vill planera månaden utan kalkylblad, stress eller ekonomijargong.`
- CTA: `Läs mer om eBudget` -> `/about-us`.

## Existing FAQ Page

- Route: `/faq`.
- Component: `Frontend/src/Pages/public/info/Faq.tsx`.
- Copy source: `Frontend/src/utils/i18n/pages/public/FaqPage.i18n.ts`.
- Accordion behavior: local `openIdx` state, one open item by index, buttons use `aria-expanded` and `aria-controls`.
- FAQ items: how budgeting works, security, export, cost, sharing, data selling.
- Header/footer behavior: shared public header; no public footer.
- Mascot: imports `FaqBird.png`.
- Contact: includes public mailto block at the bottom. Do not duplicate this on landing.
- Copy issue check: no `vi sköter mattan` or `bokföring` match found in inspected frontend/prototype. Existing copy uses `Vi räknar...` in other public/private dictionaries.

Landing teaser recommendation:

- Title: `Frågor innan du börjar?`
- Text: `Se svar om säkerhet, pris, export och hur budgeteringen fungerar.`
- CTA: `Till vanliga frågor` -> `/faq`.

## Language Selector

| Question | Finding |
| --- | --- |
| Supported languages | `sv-SE`, `en-US`, `et-EE`. |
| UI labels | `SV`, `EN`, `ET` plus full labels in menu. |
| State storage | In-memory singleton, `localStorage` key `eb_locale`, cookie key `eb_locale`. |
| Persistence | Yes, `localStorage` and cookie for 365 days. |
| Default | Browser language if `et`/`en`, otherwise `sv-SE`. |
| Public copy updates | Yes, public pages read `useAppLocale()` and dictionaries. |
| Routing affected | No locale-prefixed routes. |
| Desktop availability | Yes in `HeaderRightActions` unauthenticated public mode. |
| Mobile availability | Yes in `PublicMobileMenu` footer for unauthenticated users. |
| Target visual | Current collapsed label already reads like `SV ▾`. |

## Components And Reuse

Reuse these existing pieces:

- Public layout/header: `PublicLayout`, `PublicHeader`, `DesktopPublicMenu`, `PublicMobileMenu`.
- Header primitives: `HeaderFrame`, `HeaderPillNav`, `HeaderRightActions`, `ActionLink`.
- Language selector: `LanguagePill`.
- Layout primitives: `PageContainer`, `ContentWrapperV2`.
- Cards/surfaces: `SurfaceCard`, `InfoCard`, `Pill`.
- CTA primitives: `CtaLink`, `SecondaryLink`, `CtaButton`, `ActionLink`.
- Mascot wrapper: `Mascot`, when controlled animation/responsive sizing is needed.
- Existing public guide: `HowItWorksPage`, if the landing preview links out.

Do not create a parallel public header or a one-off language selector.

Potential new components:

- `PublicFooter` if footer appears on multiple public pages.
- Small landing-only section components inside `Frontend/src/Pages/public/Home/` if `DesktopHomePage.tsx` would otherwise become a large monolith.

## Assets And Mascot Usage

Existing relevant assets:

- Logo/header bird: `Frontend/src/assets/Images/MobileBird.png`.
- Main landing bird: `Frontend/src/assets/Images/MainPageBird.png`.
- About-related birds: `AboutUsBird.png`, `GuideBirdHappy.png`.
- FAQ bird: `FaqBird.png`.
- Many other persona birds exist (`KnightBird`, `WrenchBird`, `CarBird`, `FoodDeliveryBird`, etc.).

Recommendation:

- Use one calm brand bird in the landing hero, likely current `MainPageBird.png` unless draft 3 points to another existing asset.
- Do not introduce new mascot personas.
- Do not use multiple persona birds in About/FAQ teasers.
- Keep FAQ teaser text-only or icon-only; avoid making `FaqBird` a second landing persona.

## Translation And Copy Impact

Existing files:

- `Frontend/src/utils/i18n/pages/public/HomePage.i18n.ts`
- `Frontend/src/utils/i18n/pages/public/AboutUs.i18n.ts`
- `Frontend/src/utils/i18n/pages/public/FaqPage.i18n.ts`
- `Frontend/src/utils/i18n/pages/public/HowItWorks.i18n.ts`
- `Frontend/src/utils/i18n/menu/Menu.i18n.ts`

Missing landing keys likely needed in `HomePage.i18n.ts`:

- Hero headline/body for draft 3.
- Hero secondary CTA for `Logga in`.
- Benefit row title/body keys.
- How-it-works preview title/body/step keys.
- About teaser title/body/CTA keys.
- FAQ teaser title/body/CTA keys.
- Final CTA title/body/primary/secondary keys.
- Footer labels for inert `Integritet` and `Villkor` placeholders.

Copy rules:

- Use `budgetering`, `privatekonomi`, `månadsplanering`.
- Avoid `bokföring`.
- Do not hardcode Swedish in TSX while current public pages support three locales.
- Do not invent legal/privacy/terms text. Require approved copy.

## Test Plan For Implementation PR

Automated tests should be focused. Do not run broad expensive suites by default.

Recommended coverage:

- Add/adjust a public landing React test if the project has nearby public page test patterns; otherwise use Playwright smoke.
- Playwright public smoke:
  - `/` renders hero and draft 3 sections.
  - Header logo routes to `/`.
  - Header `Om oss` routes to `/about-us`.
  - Header `Vanliga frågor` routes to `/faq`.
  - Header `Skaffa eBudget` routes to `/registration`.
  - Header `Logga in` routes to `/login`.
  - Language selector opens, changes locale, persists across reload.
  - About teaser links to `/about-us`.
  - FAQ teaser links to `/faq`.
  - Mobile menu exposes About, FAQ, `Skaffa eBudget`, `Logga in`, and language selector.
  - Footer renders `Integritet` / `Villkor` as inert non-link text placeholders only.
  - Landing does not render the full FAQ accordion.
  - Landing does not duplicate the full About page.
  - No public contact link appears on landing.
- Manual browser verification:
  - Desktop, tablet, mobile widths.
  - No horizontal overflow.
  - Header does not wrap awkwardly.
  - Mobile drawer stays usable.
  - Mascot does not dominate or overlap copy.

## Recommended PR Breakdown

Default recommendation: one frontend implementation PR is enough for the landing refactor because:

- Existing public routing is centralized.
- Existing public header items (logo, About, FAQ, registration, login, language selector) are already correct — only the cloud treatment needs the refactor (see below).
- About and FAQ already exist as dedicated pages.
- Signup/login CTA targets already exist and are distinct.
- Language switching is already wired.
- No backend changes are needed.

Scope note (correcting an earlier draft of this doc):

- The public menu refactor IS part of this PR, not a follow-up. The `public` preset in `Frontend/src/components/organisms/Menu/hooks/header.config.ts` MUST flip from `clouds.kind: "trim"` to `clouds.kind: "backdrop"` so the desktop header renders the full cloud menu via `CloudBackdrop` + `CloudMenu_1440.svg`. Leaving it as `trim` is rejected at review. The implementer/reviewer handovers are the binding source for this rule.

Exception:

- If approved legal/privacy/terms content is not available, do not fake it and do not ship `<a>` / `Link` elements pointing at missing legal routes. Render `Integritet` / `Villkor` as inert non-link text placeholders for this PR and split the real legal pages/links into a separate product/legal-content PR.

## Implementation PR Scope

Change (required):

- `Frontend/src/Pages/public/Home/DesktopHomePage.tsx`
- `Frontend/src/utils/i18n/pages/public/HomePage.i18n.ts`
- `Frontend/src/components/organisms/Menu/hooks/header.config.ts` — flip `public` preset `clouds.kind` from `"trim"` to `"backdrop"` (and adjust `opacity` / `translateY` / `heightClass` as needed). Required, not optional.

Change (optional):

- `Frontend/src/Pages/public/Home/HomePage.tsx` if renaming/splitting the component.
- `Frontend/src/layout/PublicLayout.tsx` if adding a shared `PublicFooter`.
- `Frontend/src/components/organisms/Menu/mainMenu/mobile/PublicMobileMenu.tsx` if mobile menu order needs adjustment (already CTA-first as of investigation date).

Out of scope:

- `Frontend/src/routes/appRoutes.ts` and `Frontend/src/layout/AppRoutes.tsx` — do not add legal routes in this PR. They land with the legal-content PR.

Do not change:

- Backend.
- Auth behavior.
- About page content/layout beyond bug-level fixes.
- FAQ page content/layout beyond bug-level fixes.
- Private app routes.
- Global design tokens unless a concrete layout bug requires it.
- Package versions/build config/CI.
- Public contact route/link for the landing.

## Final Recommendation

Proceed with one focused frontend PR for the landing refactor. Reuse the current public shell, header architecture, language selector, route constants, CTA primitives, and i18n pattern. The desktop header's cloud treatment must be flipped from `trim` to `backdrop` as part of this PR.

Hard blockers for that PR:

- Do not copy the prototype's `Skaffa eBudget -> login` behavior.
- Do not leave the `public` header preset on `clouds.kind: "trim"`. It must be `"backdrop"`.
- Do not ship `<a>` / `Link` elements for `Integritet` / `Villkor` / `/data-policy` — render them as inert text placeholders this PR.
- Do not add legal placeholder routes in this PR.
- Do not duplicate About or FAQ content on the landing.
- Do not add a public contact link to the landing.
