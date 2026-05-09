# PROJECT — SteenBudgetSolution

## Product purpose

Full-stack personal budgeting web application for ordinary people and households. The product is a financial tool, not a marketing surface, so it must feel calm, clear, trustworthy, and production-grade. Correctness of money math and lifecycle (open/closed months, snapshots, carry-over) is the central concern.

## Stack

**Backend**
- .NET 8 / ASP.NET Core Web API (C#)
- MariaDB (primary database)
- Dapper (data access — chosen intentionally; no EF or other ORMs)
- MediatR-based feature slices
- ASP.NET Core WebSockets (real-time, including session termination)
- MailKit (email)

**Frontend**
- React + TypeScript
- Vite (build/dev server)
- Tailwind CSS (with shadcn, eBudget, and wizard token systems)
- Axios (with token-refresh interceptor)
- Playwright (E2E)

**Infrastructure**
- Docker / Docker Compose for local and prod
- Caddy (reverse proxy, ACME via Cloudflare DNS-01)
- Self-hosted home lab: Pi 4 (prod host), Pi 3 (CI/CD runner)
- GitHub Actions + GHCR (build factory + container registry)
- UFW + Fail2Ban (host hardening)

## Architecture decisions (with rationale)

- **Clean Architecture** (Domain / Application / Infrastructure / Presentation) — keeps financial business rules out of controllers and infrastructure, so they remain testable and reviewable.
- **Dapper, not EF** — explicit SQL is preferred for query correctness on financial data and for MariaDB compatibility.
- **Feature slices via MediatR** — each command/query/handler/validator/DTO lives close to its endpoint; new work copies the nearest existing slice.
- **Transaction discipline / UnitOfWork** — repository methods may require an active transaction; reads and writes are separated; idempotency matters for month lifecycle operations.
- **`decimal` for all money** — never `float`/`double`; rounding is explicit only.
- **Branded eBudget design system** — existing CSS tokens (`--eb-*`, `--wizard-*`, shadcn) are the source of truth; do not introduce parallel palettes.
- **Self-hosted CI/CD split** — GitHub builds multi-arch images, the Pi 3 runner deploys to the Pi 4 over LAN SSH (no inbound ports on the runner host).

## Folder structure

```
Backend/                  .NET 8 Web API (Domain, Application, Infrastructure, Presentation)
Backend/SQL/MariaDB/      DDL and migration-style scripts
Backend.Tools/            Seeder CLI (gated by ALLOW_SEEDING)
Backend.Tests/            Unit + integration tests (UnitTestBase, IntegrationTestBase)
EmailDebugger/            Local email debug utility
Frontend/src/             React + TS source
Frontend/e2e/             Playwright suites (smoke + full projects)
caddy/                    Caddy config for prod
database/init/            Init scripts used by docker compose
docs/                     API, Security, Email, WebSockets, ADRs, lifecycle spec, roadmap
.github/workflows/        CI/CD pipelines
.agents/instructions/     Canonical agent instruction files (backend, frontend-ui)
.agents/skills/           Optional skill packs (frontend-design)
```

## Dev commands

Dev DB (from repo root):
```
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
```

Backend (from `Backend/`):
```
DOTNET_USE_POLLING_FILE_WATCHER=true dotnet watch run --urls http://localhost:5001
dotnet build
```

Frontend (from `Frontend/`):
```
npm install && npm run dev
npm run test:e2e            # full
npm run test:e2e:smoke      # PR validation slice
```

Seed (preferred, Docker):
```
./scripts/seed-dev.sh
```

## Key files to know

- `Backend/Program.cs` — composition root, pipeline behaviors, auth wiring.
- `Backend/Application/` — handlers, validators, DTOs, MediatR pipeline (transactional behavior).
- `Backend/Infrastructure/` — repositories, Dapper data access, UnitOfWork, WebSocket handler.
- `Backend.Tests/UnitTests/BaseClasses/UnitTestBase.cs`, `Backend.Tests/IntegrationTests/BaseClasses/IntegrationTestBase.cs` — test base classes new tests should inherit from.
- `Frontend/tailwind.config.js` and the eBudget / wizard / shadcn token CSS — design source of truth.
- `Frontend/playwright.config.ts` — projects (`smoke`, `full`), webserver orchestration.
- `docs/BudgetPeriodLifecycleSpec.md` — month open/close/carry-over rules.
- `docs/adr/` — architecture decisions (UnitOfWork, expense flattening).

## Secrets / env approach

- **Never commit secrets.** No tokens, passwords, connection strings, or API keys in source.
- Backend dev: `dotnet user-secrets` (DB connection string, JWT keys, Turnstile, WebSocket secret).
- Frontend dev: `Frontend/.env.local` (`VITE_APP_API_URL`, `VITE_TURNSTILE_SITE_KEY`, `VITE_USE_MOCK`).
- Docker compose dev: `.env.dev` at repo root (literal values; `.env` files do not expand `${VAR}`).
- Prod: `.env` on the Pi 4 host plus GitHub Actions secrets; not in Git.
- Seeding: gated by `ALLOW_SEEDING=true`; Turnstile is bypassed for seed flows only.

## CI/CD overview

- Push to `master` → GitHub Actions builds multi-arch (`linux/amd64`, `linux/arm64`) backend image, pushes to GHCR; builds the Vite frontend bundle and uploads as an artifact.
- The `deploy` job is picked up by the self-hosted runner on the Pi 3, which SSHes to the Pi 4 (forced-command key, LAN only) and triggers `docker compose up` with the freshly pulled image and frontend artifact.
- Caddy on the Pi 4 serves the static frontend and reverse-proxies `/api/*` to the backend container; TLS is issued via Cloudflare DNS-01.
- Pi 3 has zero inbound ports from the internet.

## Test layout

- Backend unit + integration tests in `Backend.Tests/` using xUnit-style base classes.
- Integration tests use a real MariaDB-backed test DB; financial logic, lifecycle transitions, repository queries, and transactional behavior should prefer integration tests over heavy mocking.
- Playwright lives in `Frontend/e2e/`, split into `smoke` (small, fast, PR-gated) and `full` (broader). Seeded against a dedicated `steenbudgetE2E` database via `Backend.Tools seed-e2e`.
