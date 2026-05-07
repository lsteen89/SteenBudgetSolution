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

- backend health

- login

- dashboard load

- balanced close-month

### full

Broader scenario coverage.

Examples:

- dashboard flow

- close-month scenarios

- future seeded regression flows

## Running locally

The easiest path is the repository helper:

```bash
./scripts/playwright-e2e.sh smoke
```

It starts the E2E MariaDB service, starts the backend on `http://localhost:5001`, lets Playwright start Vite on `http://localhost:5173`, and runs the smoke project. The backend is stopped when the script exits; the database container is left running for faster later runs.

Other useful forms:

```bash
./scripts/playwright-e2e.sh full
./scripts/playwright-e2e.sh all
./scripts/playwright-e2e.sh test --headed --project=smoke
```

Manual setup is still useful when debugging.

Start the E2E database from the repository root:

```bash
docker compose --env-file .env.e2e -f docker-compose.e2e.yml up -d db-e2e
```

Start the backend against the dedicated E2E database:

```bash
cd Backend
DOTNET_ENVIRONMENT=Development \
DATABASESETTINGS__CONNECTIONSTRING='Server=127.0.0.1;Port=3307;Database=steenbudgetE2E;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16' \
ALLOW_SEEDING=true \
SEED_CLOCK_UTC='2026-04-26T12:00:00Z' \
WEBSOCKET_SECRET='dev-ws-secret' \
Jwt__ActiveKid='dev' \
Jwt__Keys__dev='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
DOTNET_USE_POLLING_FILE_WATCHER=true \
dotnet watch run --urls http://localhost:5001
```

Do not `source .env.e2e` in your shell. The file is dotenv syntax and its semicolon-delimited connection strings are not shell-safe unless every value is parsed as dotenv or manually quoted.

From `Frontend/`, Playwright resets and seeds `steenbudgetE2E` automatically through global setup:

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

Ports `3307`, `5001`, and `5173` must be free. The E2E database uses `3307` so it does not collide with the dev database on `3306`; Playwright starts its own frontend dev server on `5173`, and the backend Development CORS policy allows `http://localhost:5173`.

## CI smoke

GitHub Actions runs the Playwright smoke subset in `.github/workflows/cicd.yml`.

The CI job:

- starts a MariaDB 11.4 service
- prepares `steenbudgetE2E` with `Backend.Tools seed-e2e`
- starts the backend on `http://localhost:5001`
- lets Playwright global setup reset and reseed the E2E database again immediately before tests
- starts the frontend on `http://localhost:5173`
- runs `npm run test:e2e:smoke`

The CI smoke subset is intentionally small and currently includes:

- backend health
- seeded login
- seeded dashboard load
- balanced close-month

Surplus and deficit close-month flows are kept out of CI smoke until they are promoted to tagged smoke tests.

## E2E seed data

The E2E seed uses the dedicated database `steenbudgetE2E`.

It is intentionally separate from the Docker-first local dev seed flow and the shared `steenbudgetDEV` database.

Seeded users:

| Email                                  | Password       | Purpose                                                                                                                      |
| -------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `e2e-login@local.test`                 | `ChangeMe123!` | Plain login-capable user                                                                                                     |
| `e2e-close-balanced@local.test`        | `ChangeMe123!` | Dashboard-ready user; `2026-04` closes directly from a balanced modal                                                        |
| `e2e-close-surplus-full@local.test`    | `ChangeMe123!` | Dashboard-ready user; `2026-04` starts with surplus and resolves via carry-over before close                                 |
| `e2e-close-deficit@local.test`         | `ChangeMe123!` | Dashboard-ready user; `2026-04` starts negative and closes directly when business rules allow it                             |
| `e2e-recap-subscriptions@local.test`   | `ChangeMe123!` | Dashboard-ready user; closed `2026-03` recap exercises subscription states (active, renamed, new, removed, paused, cancelled) |
| `e2e-recap-savings-debt@local.test`    | `ChangeMe123!` | Dashboard-ready user; closed `2026-03` recap exercises savings goal + debt deltas, current-only month rows, and ordering cues  |
| `e2e-recap-sankey-stress@local.test`   | `ChangeMe123!` | Dashboard-ready user; closed `2026-03` recap exercises large Sankey totals, carry-over outcome display, long/current-only/previous-only expense categories, and top increase drivers |
| `e2e-recap-first-closed@local.test`    | `ChangeMe123!` | Dashboard-ready user; closed `2026-01` recap exercises first-closed-month behavior with no previous comparable month, active subscriptions, savings/debt rows without deltas, and no carry-over |
| `e2e-recap-comparison-skip@local.test` | `ChangeMe123!` | Dashboard-ready user; closed `2026-03` recap compares against `2026-01` while skipped `2026-02` is ignored; includes obvious snapshot, category, savings, and debt deltas |

All dashboard-ready E2E users share the same month timeline:

- `2026-01` closed baseline month
- `2026-02` skipped month
- `2026-03` closed comparable month
- `2026-04` open month

They have `FirstLogin = 0` and the close window is open under the fixed seed clock `2026-04-26T12:00:00Z`.

Focused full-project recap checks can be run with a grep against the seeded scenario name, for example:

```bash
./scripts/playwright-e2e.sh test --project=full --grep "recap-sankey-stress"
./scripts/playwright-e2e.sh test --project=full --grep "first closed recap"
./scripts/playwright-e2e.sh test --project=full --grep "comparison skip"
```

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
