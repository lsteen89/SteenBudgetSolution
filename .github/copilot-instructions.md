# Copilot Instructions for SteenBudgetSolution

Purpose
- Provide concise, actionable guidance for Copilot/Copilot-CLI sessions working in this repository.

Quick commands
- Backend (dev):
  - Start (hot reload): cd Backend && DOTNET_USE_POLLING_FILE_WATCHER=true dotnet watch run --urls http://localhost:5001
  - Build: cd Backend && dotnet build
  - Publish: cd Backend && dotnet publish Backend.csproj -c Release -o /path/to/out
  - Run a single backend test: dotnet test <path-to-test-project> --filter "FullyQualifiedName=Namespace.ClassName.TestName"
  - Run all tests in a project: dotnet test <path-to-test-project>

- Frontend:
  - Install & dev server: cd Frontend && npm install && npm run dev
  - Build: cd Frontend && VITE_APP_API_URL=<url> npm run build
  - Lint (if package.json has script): cd Frontend && npm run lint
  - Run eslint directly: npx eslint "./Frontend/src/**"

- Dev DB / seeding:
  - Start dev MariaDB: docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
  - Seed via Docker (recommended): docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users
  - Seed locally (Backend.Tools): cd Backend.Tools && ALLOW_SEEDING=true DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" dotnet run -- seed-user --email jane@doe.se --password 'ChangeMe123' --first Jane --last Doe

Files & docs to read first
- AGENTS.md (authoritative agent rules and repo conventions)
- INSTALL.md (dev/production setup, DB, seeding, envs)
- README.md and docs/ (API, WebSockets, Security)

High-level architecture (short)
- Backend: .NET 8 Web API (Clean Architecture). Data access via Dapper; feature-slices with MediatR; WebSockets for realtime; MailKit for email. MariaDB is primary DB.
- Frontend: React + TypeScript, built with Vite, styled with Tailwind, Axios for API calls, uses Vite env variables for API url and keys.
- Infra: Docker Compose for local/dev, Caddy in production, GitHub Actions + self-hosted runner for CI/CD, GHCR for container images.

Key repository conventions
- Follow AGENTS.md strictly: diagnose before change, small scope, preserve clean architecture boundaries.
- Dapper-only: do not introduce EF or other ORMs.
- Feature-slice pattern: new handlers/DTOs/validators should mimic nearby existing slices.
- Transaction discipline: repository methods may require active transactions — follow existing patterns.
- Secrets: do not commit secrets. Use dotnet user-secrets for Backend dev and .env(.dev) for docker compose. Production secrets live on host / GitHub Actions secrets.
- Seeding: use Backend.Tools or docker compose seed profiles; seeding is gated by ALLOW_SEEDING.
- Git safety: do not change git history (no commit/push/rebase with the agent). When asked for a commit message, write it to COMMIT_MSG.tmp using Conventional Commits.

Testing guidance
- Prefer running only the tests relevant to changed code. Use dotnet test with --filter for single tests. Frontend tests (if present) follow package.json scripts (npm test / vitest).

Where to look for patterns
- Backend: Backend/ feature slices, Backend.Tools for utilities, Backend/SQL for DB scripts.
- Frontend: Frontend/src for component patterns, Tailwind tokens in tailwind.config.js, Vite env usage in .env.local example.

Other AI assistant configs
- AGENTS.md is present and comprehensive; check .github/instructions/ if present. Follow its rules; it is the canonical agent guide inside this repo.

Quick dos & don'ts for Copilot sessions
- DO: Inspect relevant handlers, DTOs, and SQL before changing code. Run narrow builds/tests after changes.
- DO: Respect transaction patterns and Dapper SQL style (explicit columns, readable queries).
- DON'T: Autonomously rewrite large areas, change repo history, or commit secrets.

Contact & follow-up
- After making changes, run the narrowest validation (dotnet build, dotnet test for affected projects, npm run build for frontend if modified).

---

(End of copilot instructions)
