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

- Playwright runs `Frontend/e2e/global-setup.ts` before tests

- Global setup resets and reseeds the dedicated E2E database

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

Start the dev database from the repository root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
```

Start the backend against the dedicated E2E database:

```bash
cd Backend
DOTNET_ENVIRONMENT=Development \
DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetE2E;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" \
DOTNET_USE_POLLING_FILE_WATCHER=true \
dotnet watch run --urls http://localhost:5001
```

From `Frontend/`:

```bash
npm run test:e2e

```

Run only smoke tests:

```bash
npm run test:e2e:smoke

```

Run only the fuller suite:

```bash
npm run test:e2e:full

```

Open the report:

```bash
npm run test:e2e:report

```

You can also run Playwright directly from `Frontend/`:

```bash
npx playwright test
```

The Playwright global setup automatically runs `Backend.Tools seed-e2e`, so you should not manually seed before every test run.

Port `5173` must be free because Playwright starts its own frontend dev server and the backend Development CORS policy allows `http://localhost:5173`.

## E2E seed data

The E2E seed uses the dedicated database `steenbudgetE2E`.

It is intentionally separate from the Docker-first local dev seed flow and the shared `steenbudgetDEV` database.

Seeded users:

| Email | Password | Purpose |
| --- | --- | --- |
| `e2e-login@local.test` | `ChangeMe123!` | Plain login-capable user |
| `e2e-close-balanced@local.test` | `ChangeMe123!` | Dashboard-ready user; `2026-04` closes directly from a balanced modal |
| `e2e-close-surplus-full@local.test` | `ChangeMe123!` | Dashboard-ready user; `2026-04` starts with surplus and resolves via carry-over before close |
| `e2e-close-deficit@local.test` | `ChangeMe123!` | Dashboard-ready user; `2026-04` starts negative and closes directly when business rules allow it |

All close-month E2E users have:

- `FirstLogin = 0`
- open month `2026-04`
- close window open under the fixed seed clock `2026-04-26T12:00:00Z`

## Reset model

`seed-e2e` creates `steenbudgetE2E` from `database/init` if the schema is missing.

On later runs it disables foreign key checks, truncates E2E tables, and reseeds the fixed users. It does not run `docker compose down -v`, does not touch `steenbudgetDEV`, and does not use the local demo accounts.

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
