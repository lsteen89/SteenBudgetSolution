# Public Landing Page Refactor - Reviewer Handover

Date: 2026-06-08

Review the implementation against:

- `docs/ai/public-landing-page-refactor-investigation.md`
- `docs/ai/public-landing-page-implementer-handover.md`
- Prototype reference: `/Users/linussteen/Downloads/eBudget Marketing Kit (offline)(2).html`

## Review Stance

This PR should be one focused frontend PR:

- Landing page refactor.
- Public menu refactor back to cloud-menu direction.
- Minimal footer/legal link handling.

Reject broad rewrites, backend work, auth changes, or About/FAQ rebuilds.

## Non-Negotiables

Block the PR if any of these are wrong:

- `Skaffa eBudget` routes to `/registration`, not `/login`.
- `Logga in` routes to `/login`.
- The public menu refactor is included and the `public` preset in `Frontend/src/components/organisms/Menu/hooks/header.config.ts` uses `clouds.kind: "backdrop"` (full cloud menu via `CloudBackdrop` + `CloudMenu_1440.svg`). Leaving `kind: "trim"` is a block.
- About remains a dedicated `/about-us` page.
- FAQ remains a dedicated `/faq` page.
- Landing only teases About/FAQ; it does not duplicate full page content.
- Language selector remains visible and functional.
- Landing has no public contact link.
- No new mascot persona is added.
- No backend changes.
- No fake legal/privacy/terms copy.

## Menu Review Checklist

This is part of the task. If the menu is not touched, the implementation is incomplete.

Files likely involved:

- `Frontend/src/components/organisms/Menu/hooks/header.config.ts`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/DesktopPublicMenu.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/HeaderFrame.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/CloudBackdrop.tsx`
- `Frontend/src/components/organisms/Menu/mainMenu/desktop/CloudTrim.tsx`

Check:

- `header.config.ts` `public` preset has `clouds.kind: "backdrop"`. Block on `"trim"`.
- Desktop public header renders the full cloud menu via `CloudBackdrop` + `CloudMenu_1440.svg`. Block on `CloudTrim` for the public preset.
- The `app` (authenticated) preset is unchanged in this PR.
- Public desktop menu uses the existing cloud assets/components, not a new parallel shell.
- Public header remains minimal:
  - Logo / wordmark.
  - `Om oss`.
  - `Vanliga frågor`.
  - `Skaffa eBudget`.
  - `Logga in`.
  - Language selector.
- No `Home` link.
- No `Kontakt` link.
- App/authenticated header behavior is not accidentally changed.
- Cloud treatment does not obscure nav text or CTAs.
- Motion respects reduced-motion behavior if animation is used.

## Landing Review Checklist

Required landing sections:

1. Hero
2. Benefit/principle row
3. Short "Så funkar eBudget" preview
4. About teaser
5. FAQ teaser
6. Final CTA
7. Minimal footer

Check:

- Visual direction is clean Nordic calm premium, not childish or loud.
- Copy explains the product quickly.
- Money/planning language is correct.
- Uses existing eBudget tokens/components.
- Does not create a parallel design system.
- Does not add broad unrelated cleanup.

## CTA Routing Checklist

| CTA | Expected |
| --- | --- |
| Logo | `/` |
| Header `Om oss` | `/about-us` |
| Header `Vanliga frågor` | `/faq` |
| Header `Skaffa eBudget` | `/registration` |
| Header `Logga in` | `/login` |
| Hero primary | `/registration` |
| Hero secondary | `/login` |
| About teaser | `/about-us` |
| FAQ teaser | `/faq` |
| Final CTA primary | `/registration` |
| Final CTA secondary | `/login` |
| Language selector | Existing locale switch behavior |

Prototype trap:

- The prototype maps `get` to `login`. That is wrong for production. Block if copied.

## Mobile Review Checklist

Decision: keep CTA-first order.

Expected mobile menu:

1. `Skaffa eBudget`
2. `Logga in`
3. `Vanliga frågor`
4. `Om oss`
5. Language selector

Check:

- No horizontal overflow.
- Drawer/panel is usable at phone widths.
- Primary CTA remains easy to find.
- Language selector is reachable.
- Menu closes on route change.
- Header does not cover landing content awkwardly.

## i18n And Copy Checklist

Required:

- Visible public landing copy uses existing i18n dictionary pattern.
- New keys exist for Swedish, English, and Estonian.
- Direct translations are acceptable.

Swedish wording rules:

- Use `budgetering`.
- Use `privatekonomi`.
- Use `månadsplanering`.
- Avoid `bokföring`.

Required Swedish teaser copy:

- `Byggd för lugnare privatekonomi`
- `eBudget är gjort för hushåll som vill planera månaden utan kalkylblad, stress eller ekonomijargong.`
- `Läs mer om eBudget`
- `Frågor innan du börjar?`
- `Se svar om säkerhet, pris, export och hur budgeteringen fungerar.`
- `Till vanliga frågor`

Check for typo/copy debt:

- No `vi sköter mattan`.
- Prefer `vi räknar åt dig` if that idea appears.

## Footer And Legal Links

Decision:

- Minimal footer is allowed.
- Privacy/terms page content is future work.

Legal-link rule (binding — same rule appears in the implementer handover):

- Footer must not invent legal copy.
- `Integritet` and `Villkor` MUST be rendered as inert non-link text placeholders (plain `<span>` or equivalent). No `<a>` / `Link`. No `href` pointing at `/integritet`, `/villkor`, `/data-policy`, or any other legal route.
- A one-line code comment near the placeholders must mark them as pending the legal-content PR.
- Adding a placeholder route in this PR is out of scope; that lands with the real legal pages.
- Do not let the implementation add a public contact link to the landing.

Block if:

- The footer ships `<a>` / `Link` elements that 404 (e.g. `/integritet`, `/villkor`, `/data-policy`).
- The footer renders fake privacy/terms body copy.
- Real legal content is invented to make links work inside this PR.

## Asset And Mascot Checklist

Expected:

- Use existing main brand bird, likely `MainPageBird.png`.
- Header can keep `MobileBird.png`.
- No new generated mascot.
- No multiple mascot personas on the landing.
- FAQ teaser should not become a second mascot scene.

Block if:

- New detective/glasses/childish FAQ bird concept appears.
- Multiple persona birds are used to decorate each section.
- Mascot dominates the hero and buries the product message.

## Validation To Expect

At minimum:

- `npm run build` from `Frontend/`.
- Browser/manual or Playwright verification for desktop and mobile.

Expected verification notes:

- Header links route correctly.
- CTA routes are distinct and correct.
- Language selector works.
- Mobile menu exposes required actions.
- Landing does not duplicate About/FAQ.
- No contact link on landing.
- No horizontal overflow.
- Cloud menu renders correctly and does not overlap content.

## Common Failure Modes

Watch for these:

- Implementer only changes landing and forgets the cloud menu.
- `Skaffa eBudget` accidentally points to `/login`.
- New landing hardcodes Swedish instead of using i18n.
- Footer adds `Integritet`/`Villkor` links with fake legal pages.
- Landing duplicates the full FAQ accordion.
- Landing duplicates About content.
- Public contact is added because existing FAQ has contact.
- New component tree duplicates existing header/layout primitives.
- App header gets changed while refactoring public header.
- Menu looks good on desktop but breaks mobile.

## Review Outcome Guidance

Approve only if:

- Scope is tight.
- Menu refactor is included.
- Routes are correct.
- Language selector still works.
- Landing structure matches the approved direction.
- Validation was actually run and reported honestly.

Request changes if:

- The public menu cloud direction is missing.
- CTA routing is wrong.
- Legal copy is invented.
- New public contact appears on landing.
- About/FAQ are rebuilt instead of teased.
- There are unrelated rewrites.
