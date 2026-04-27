# SteenBudgetSolution

[![CI/CD Pipeline](https://github.com/lsteen89/SteenBudgetSolution/actions/workflows/cicd.yml/badge.svg)](https://github.com/lsteen89/SteenBudgetSolution/actions/workflows/cicd.yml)
![alt text](https://img.shields.io/badge/License-MIT-yellow.svg)

SteenBudgetSolution is a comprehensive, full-stack personal finance management application designed to empower users to track income, expenses, and manage budgets effectively.

This project showcases the ability to design, build, deploy, and manage a complete application end-to-end, with a strong emphasis on **secure development practices**, **modern technologies**, **robust infrastructure**, and **efficient CI/CD workflows**, all self-hosted on a Raspberry Pi home lab.

---

# Project Docs

Quick links:

- **Security**
  - [Authentication](docs/Security/Authentication.md)
  - [Rate Limits](docs/Security/rate-limits.md)
- **Email**
  - [Email Workflows](docs/Email/email-workflows.md)
- **API**
  - [API Reference](docs/API/api.md)
- **WebSockets**
  - [WebSocket Handler](docs/WebSockets/WebSocketHandler.md)
- **Roadmap**
  - [Roadmap](docs/roadmap.md)

---

# Architecture Overview

This project uses a modern, separated architecture to ensure security, stability, and maintainability.

### Pi 4 (Production Host)

- **Role:** The dedicated, hardened server that runs the live application stack.
- **Services:** Runs the entire stack within Docker Compose: MariaDB, the .NET 8 backend API, and a Caddy web server.
- **Security:**
  - Exposes only HTTP/HTTPS (80/443) to the web.
  - SSH (port 2222) is only accessible from the Pi 3 runner's local IP address. All other SSH traffic is blocked by `ufw`.
  - SSH is configured for key-only authentication; password login is disabled.
- **Secrets:** All application secrets (database credentials, JWT keys, etc.) are managed in a `.env` file in the project directory, which is excluded from Git.

### Pi 3 (CI/CD Runner & Deploy Orchestrator)

- **Role:** A trusted, internal orchestrator that receives deployment jobs from GitHub and executes them securely.
- **Services:** Runs a single containerized GitHub Actions self-hosted runner.
- **Security:**
  - Requires **zero inbound ports** from the internet. It only makes outbound connections to GitHub.
  - It communicates with the Pi 4 over the local LAN using a dedicated, forced-command SSH key.
  - Its sole purpose is to execute the deployment steps defined in the CI/CD workflow.

### GitHub (Cloud Build Environment)

- **Role:** Acts as a powerful, disposable **build factory**. It handles all CPU-intensive compilation and packaging.
- **Actions:**
  - On a push to `master`, it builds a **multi-architecture (`linux/amd64`, `linux/arm64`)** backend Docker image and pushes it to the GitHub Container Registry (GHCR).
  - It builds the production-optimized React frontend (`dist` bundle) and uploads it as a workflow artifact.
  - It then triggers the `deploy` job, which is picked up by the self-hosted runner on the Pi 3.

### Cloudflare (DNS & TLS Helper)

- **Role:** Manages the `ebudget.se` DNS records.
- **Actions:** Used by Caddy to perform the ACME DNS-01 challenge. Caddy uses a scoped API token to create and delete temporary TXT records to prove domain ownership for issuing and renewing Let's Encrypt TLS certificates.

---

## Key Features

- 🔐 **Secure User Authentication:** Robust JWT-based authentication featuring auto-refresh, periodic status checks, and WebSocket integration for immediate session termination.
- 🤖 **ReCAPTCHA Integration:** Protects user registration from bots using Google reCAPTCHA v3.
- 💰 **Full CRUD Operations:** Manage budgets, income, and expense transactions with complete Create, Read, Update, and Delete functionality.
- 📧 **Email Notifications:** Integrated SMTP client (using MailKit) for user email verification and essential notifications.
- 📱 **Responsive Design:** Modern, mobile-first UI built with Tailwind CSS ensures a great experience on any device.
- 🚀 **Real-time Communication:** Employs WebSockets for immediate server-driven events (like session termination) and uses a ping/pong mechanism to maintain connection health.
- 🛡️ **Hardened Security:** Multi-layered security approach including infrastructure hardening and application-level protections.

---

## Tech Stack

**Backend:**

- **Framework:** .NET 8 (C#) with ASP.NET Core Web API
- **Database:** MariaDB (SQL-based relational database)
- **Data Access:** Dapper (Micro-ORM, chosen for performance and direct SQL control)
- **Architecture:** Clean Architecture principles for separation of concerns and testability.
- **Real-time:** ASP.NET Core WebSockets
- **Email:** MailKit

**Frontend:**

- **Framework:** React (TypeScript) for a robust and type-safe UI.
- **Build Tool:** Vite for fast development server and optimized builds.
- **Styling:** Tailwind CSS (Utility-first CSS framework).
- **API Communication:** Axios (with interceptor for token refresh)

**Infrastructure & DevOps:**

- **Host:** Self-hosted on Raspberry Pi 4 (Linux OS)
- **Orchestrator:** Raspberry Pi 3 (Linux OS)
- **Containerization:** Docker & Docker Compose
- **Web Server / Reverse Proxy:** Caddy (with automatic HTTPS)
- **Security Tools:** UFW (Firewall), Fail2Ban (Intrusion Prevention)
- **CI/CD:** GitHub Actions (Automated build, test, and deployment pipeline)
- **Secrets Management:** GitHub Actions Secrets & `.env` file on host.
- **Domain & Network:** Custom Domain, DNS Management via Cloudflare

---

# 🚀 Getting Started (Local Development)

> **Recommended dev mode:** MariaDB in Docker; Backend & Frontend run natively (hot-reload).
> **Prod:** `.env` (only). **Dev:** backend uses **user-secrets**, frontend uses **`.env.local`**.

---

## 0) Prereqs (Mac/Linux)

- Docker Desktop (or Colima) running
- .NET 8 SDK
- Node 18+ / 20+

---

## 1) Dev database (Docker MariaDB)

Create a local file (DO NOT COMMIT): `./.env.dev`

```env
MARIADB_ROOT_PASSWORD=devrootpassword
MARIADB_DATABASE=steenbudgetDEV
MARIADB_USER=app
MARIADB_PASSWORD=apppwd

```

> Note: `.env` files do **not** expand `${VARS}`. Write literal values.

Start DB (run from repo root):

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
docker compose --env-file .env.dev -f docker-compose.dev.yml ps

```

---

## 2) Backend setup (user-secrets)

```bash

cd Backend
dotnet user-secrets init

# DB (host → container via 127.0.0.1)
dotnet user-secrets set "DatabaseSettings:ConnectionString" \
"Server=127.0.0.1;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16"

# JWT (dev)
dotnet user-secrets set "JwtSettings:SecretKey" "base64:REPLACE_ME"
dotnet user-secrets set "Jwt:Keys:dev" "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
dotnet user-secrets set "Jwt:ActiveKid" "dev"

# WebSocket auth
dotnet user-secrets set "WEBSOCKET_SECRET" "dev-ws-secret"

# Turnstile (dev/test keys)
dotnet user-secrets set "Turnstile:VerifyUrl" "https://challenges.cloudflare.com/turnstile/v0/siteverify"
dotnet user-secrets set "Turnstile:SecretKey" "1x0000000000000000000000000000000AA"
dotnet user-secrets set "Turnstile:Enabled" "true"

```

Generate a JWT key:

```bash
openssl rand -base64 32
# then set JwtSettings:SecretKey = base64:<value>

```

Run backend (hot reload):

```bash
cd Backend
DOTNET_USE_POLLING_FILE_WATCHER=true dotnet watch run --urls http://localhost:5001

```

---

## 3) Frontend setup (Vite)

Create: `Frontend/.env.local`

```env
VITE_APP_API_URL=http://localhost:5001
VITE_TURNSTILE_SITE_KEY=XYZ
VITE_USE_MOCK=false

```

Run frontend:

```bash
cd Frontend
npm install
npm run dev

```

> If you edit `.env.local`, restart Vite.

---

## 🧪 Dev seeding (users)

A small CLI (`Backend.Tools`) can seed deterministic local-only users and budget data in **dev**.
The primary supported flow is Docker Compose against the Docker dev database.
For the full reset-and-seed checklist, see [Local Seeding Playbook](docs/local-seeding-playbook.md).

- Seeding is guarded by `ALLOW_SEEDING=true`
- TURNSTILE is bypassed for seeding
- Use the Docker Compose `seed-users` service to create fixed demo users only
- Use the Docker Compose `seed-users-with-budget` service to create fixed budget demo users with baseline data,
  2 closed months, 1 open month, and `Users.FirstLogin = 0` so the dashboard skips the setup wizard

### Docker reset + seed flow

Run from repo root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users-with-budget

```

The seed containers use the Docker-internal connection string already set in `docker-compose.dev.yml`:

```yml
DATABASESETTINGS__CONNECTIONSTRING: "Server=db;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16"
ALLOW_SEEDING: "true"
```

### Seeded local accounts

- `demo1@local.test` / `ChangeMe123!`: plain seeded user for login/auth smoke testing
- `demo2@local.test` / `ChangeMe123!`: second plain seeded user for multi-user sanity checks
- `budgetdemo@local.test` / `ChangeMe123!`: budget demo user with baseline income, expenses, savings, debt, and month data
- `closemonth@local.test` / `ChangeMe123!`: budget demo user intended for close-month-related local testing

Budget demo users get a fixed 3-month timeline:

- `2026-02`: closed baseline month
- `2026-03`: closed month with changed income/expense/savings/debt data
- `2026-04`: open month with dashboard data and changes useful for close-month work

### Direct Backend.Tools commands

Docker Compose is preferred. For local tool debugging, the underlying commands are:

```bash
cd Backend.Tools
ALLOW_SEEDING=true DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" \
dotnet run -- seed-users

```

```bash
cd Backend.Tools
ALLOW_SEEDING=true DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" \
dotnet run -- seed-users-with-budget

```

---

## E2E testing with Playwright

The frontend uses Playwright for end-to-end browser testing.

### What it covers right now

Current E2E coverage is intentionally small and focused:

- app boot / smoke verification
- seeded user login
- foundation for dashboard and close-month flows

This is not meant to replace backend integration tests. The browser suite verifies critical user flows, while backend/database tests verify snapshot math, carry-over behavior, and transactional correctness.

### Test structure

Playwright tests live in:

```text
Frontend/e2e/
```

The suite is split into two logical projects:

- **smoke** — tiny fast checks intended for PR validation
- **full** — broader scenario coverage

### Configuration

Playwright is configured in:

```text
Frontend/playwright.config.ts
```

Key behavior:

- runs against the local frontend dev server
- uses Chromium
- keeps traces, screenshots, and video only when helpful for failures
- generates an HTML report after execution

Playwright supports projects, web server orchestration, reporters, traces, screenshots, and videos directly through the config file. ([Playwright][4])

### Prerequisites

Before running E2E tests, make sure:

1. the MariaDB dev container is running
2. the backend is running against the dedicated `steenbudgetE2E` database
3. Playwright can run its global setup

### Common commands

Start the database from the repository root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
```

Start the backend against the E2E database:

```bash
cd Backend
DOTNET_ENVIRONMENT=Development \
DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetE2E;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" \
DOTNET_USE_POLLING_FILE_WATCHER=true \
dotnet watch run --urls http://localhost:5001
```

From `Frontend/`, Playwright resets and seeds `steenbudgetE2E` automatically through global setup:

Run all E2E tests:

```bash
npm run test:e2e
```

Run only smoke tests:

```bash
npm run test:e2e:smoke
```

Run the fuller suite:

```bash
npm run test:e2e:full
```

Run tests in headed mode:

```bash
npm run test:e2e:headed
```

Open the HTML report:

```bash
npm run test:e2e:report
```

Playwright’s CLI supports running tests and opening the HTML report directly. ([Playwright][5])

Port `5173` must be free because Playwright starts its own frontend dev server and the backend Development CORS policy allows `http://localhost:5173`.

### E2E seed accounts

The Playwright seed is separate from the Docker-first local dev seed flow and does not use the shared `steenbudgetDEV` demo users.

| Email | Password | Purpose |
| --- | --- | --- |
| `e2e-login@local.test` | `ChangeMe123!` | Login smoke user |
| `e2e-close-balanced@local.test` | `ChangeMe123!` | Balanced close-month flow |
| `e2e-close-surplus-full@local.test` | `ChangeMe123!` | Surplus close-month flow; resolve with carry-over |
| `e2e-close-deficit@local.test` | `ChangeMe123!` | Deficit close-month flow |

The close-month users all use deterministic open month `2026-04`.

`Backend.Tools seed-e2e` creates `steenbudgetE2E` from `database/init` when needed. On later runs it truncates E2E tables and reseeds the fixed accounts; it does not run Docker volume teardown and does not reset `steenbudgetDEV`.

### Generated artifacts

The following folders are generated during test runs and should not be committed:

- `Frontend/playwright-report/`
- `Frontend/test-results/`
- `test-results/`

The HTML reporter writes a report folder, and test artifacts such as video are typically stored in the test output directory. ([Playwright][1])

### Current testing approach

The current approach is deliberate:

- keep PR smoke coverage very small and reliable
- grow scenario coverage only around critical flows
- avoid flaky “test everything in the browser” patterns

Recommended browser focus:

- app boots
- login works
- dashboard loads
- close-month flow works end-to-end

Recommended backend/database focus:

- month closing snapshots
- carry-over math
- next-month creation
- rollback safety

## 🧰 DB access (GUI)

Recommended: **TablePlus**

- Host: `127.0.0.1`
- Port: `3306`
- User: `app`
- Password: `apppwd`
- Database: `steenbudgetDEV`
- SSL: off

> Root login from the host is typically blocked in the MariaDB image. Use `app`.

---

**Requirements**

- The seeder container uses a **Docker-internal** connection string (`Server=db;...`) already set in `docker-compose.dev.yml`.
- Service name: `seed-users`.

---

## High-Level System Flowchart

```mermaid
graph TD

    %% == 1. Define ALL Nodes First ==

    %% User Flow & Services
    UserBrowser["User's Browser"]
    Cloudflare["Cloudflare DNS"]

    %% Production Host (Pi 4)
    Pi4["Raspberry Pi 4 - Prod Host"]
    UFW(UFW Firewall)
    Caddy["Caddy Reverse Proxy"]
    BackendAPI[".NET 8 Backend API"]
    MariaDB[(MariaDB Database)]

    %% Runner Host (Pi 3)
    Pi3["Raspberry Pi 3 - CI/CD Host"]
    Runner("Self-Hosted<br/>GitHub Runner")

    %% Cloud & Git
    Developer[Developer]
    GitHubRepo(GitHub Repo)
    GitHubActions["GitHub Actions"]
    GHCR(GHCR - Container Registry)
    FrontendArtifact{Frontend Artifact}

    %% Action Node
    DockerComposeUp("docker compose up")

    %% == 2. Define Subgraphs (Visual Grouping) ==
    subgraph "Cloud Services"
        Developer
        GitHubRepo
        GitHubActions
        GHCR
        FrontendArtifact
    end

    subgraph "Home Lab"
        subgraph "Production Host (Pi 4)"
            direction LR
            Pi4
            UFW
            Caddy
            BackendAPI
            MariaDB
            DockerComposeUp
        end

        subgraph "CI/CD Host (Pi 3)"
            Pi3
            Runner
        end
    end

    %% == 3. Define Links ==

    %% User Request Flow
    UserBrowser -- HTTPS Request --> Cloudflare
    Cloudflare -- DNS Resolves --> Pi4
    Pi4 --> UFW
    UFW -- Allows Ports 80/443 --> Caddy
    Caddy -- Serves Static Frontend --> UserBrowser
    Caddy -- Proxies /api/* --> BackendAPI
    BackendAPI -- "Dapper ORM" --> MariaDB

    %% CI/CD Flow
    Developer -- git push --> GitHubRepo
    GitHubRepo -- Triggers --> GitHubActions
    GitHubActions -- 1. Builds & Pushes Image --> GHCR
    GitHubActions -- 2. Builds & Uploads --> FrontendArtifact
    GitHubActions -- 3. Sends job to --> Runner

    %% Deployment Flow
    Runner -- "Downloads Artifact &<br/>Triggers deploy.sh via SSH" --> Pi4
    GHCR -- 1. Image is Pulled by --> Pi4
    Pi4 -- 2. Executes --> DockerComposeUp
    DockerComposeUp -- Starts/Updates --> Caddy
    DockerComposeUp -- Starts/Updates --> BackendAPI


```

## License

[MIT License](LICENSE)

```

```
