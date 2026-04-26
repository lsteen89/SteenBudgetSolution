# Playwright E2E guide

## Purpose

Playwright is used for browser-level end-to-end testing of the frontend.

It is used to verify that critical user flows work in a real browser against the running application.

Examples:

- navigating to the login page

- authenticating a seeded user

- loading the dashboard

- later: closing a budget month end-to-end

Playwright is not a replacement for backend integration tests. Browser tests should stay focused and meaningful.

## How it works in this project

- Tests live in `Frontend/e2e`

- Playwright reads `Frontend/playwright.config.ts`

- The config starts or reuses the frontend dev server through `webServer`

- Tests run in Chromium

- Reports and failure artifacts are generated automatically

Playwright supports config-driven test execution, HTML reports, project-based grouping, and web server startup. :contentReference[oaicite:8]{index=8}

## Projects

We currently use two Playwright projects:

### smoke

Fast checks intended for pull requests.

Examples:

- app boot

- login

### full

Broader scenario coverage.

Examples:

- dashboard flow

- close-month scenarios

- future seeded regression flows

## Running locally

From `Frontend/`:

```bash

npm  run  test:e2e

```

Run only smoke tests:

```bash

npm  run  test:e2e:smoke

```

Run only the fuller suite:

```bash

npm  run  test:e2e:full

```

Open the report:

```bash

npm  run  test:e2e:report

```

## Debugging failures

When a test fails:

1. read the terminal output

2. open the HTML report

3. inspect the trace for the failed test

4. inspect generated screenshots/video if available

The HTML report and trace viewer are core Playwright debugging tools. ([Playwright][6])

## Rules for writing tests

- Prefer user-facing locators like `getByRole(...)`

- Use accessible names to avoid ambiguous locators

- Keep smoke tests tiny

- Do not test every numeric detail through the browser

- Put business correctness in backend/database tests

- Use stable `data-testid` markers for important app-specific anchors when needed

Playwright recommends resilient locators and clear test structure. ([Playwright][7])

## Future direction

As the suite grows, authenticated tests should stop logging in through the UI every time. Playwright supports authenticating once and reusing stored auth state across tests. That is the preferred next step once the basic smoke lane is stable. ([Playwright][8])
