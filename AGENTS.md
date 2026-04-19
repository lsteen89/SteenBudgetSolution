# `AGENTS.md`

```md
# AGENTS.md

This file defines how AI coding agents must operate in this repository.

The goal is not blind speed. The goal is safe, understandable, production-grade progress with minimal unwanted changes.

If you are an AI agent working in this repository, follow this file strictly.
```

---

## 1. Product Purpose

This project is a full-stack personal budgeting web application for ordinary people and households.

The product must feel:

- clear
- calm
- trustworthy
- simple to use
- production-grade

This is not a toy app. Financial data and user trust matter.

Prioritize:

- correctness
- maintainability
- readability
- explicitness
- safe incremental changes

Do not optimize for cleverness.

---

## 2. Operating Principles

### 2.1 Diagnose first, change second

Before making code changes:

1. inspect the relevant code path
2. identify the likely root cause or required implementation points
3. explain the intended change clearly
4. only then modify code

Do not jump straight into editing files without understanding the current flow.

### 2.2 Small, controlled scope

Only modify files directly related to the task.

Do not perform unrelated cleanups, refactors, renames, formatting sweeps, or architectural rewrites unless explicitly asked.

### 2.3 Preserve developer control

The human developer wants high control over the codebase.

Default behavior:

- propose minimal changes
- prefer incremental improvements
- avoid broad autonomous repo-wide edits
- do not invent architecture without clear support from existing patterns

### 2.4 Follow existing patterns

Before adding new code:

- inspect similar existing features
- match naming conventions
- match folder structure
- match test patterns
- match API and DTO conventions
- match frontend component composition patterns

Do not introduce new patterns if an acceptable repository pattern already exists.

### 2.5 Clarity over brevity

Write code that is explicit, readable, and maintainable.

Avoid:

- hidden magic
- over-abstraction
- speculative generalization
- unnecessary helpers
- compact but unclear code

### 2.6 Financial correctness matters

This app handles budgeting and money-related flows.

Be very careful with:

- currency formatting
- totals
- monthly calculations
- carry-over logic
- budget month state transitions
- read-only vs editable month behavior

If unsure, inspect existing logic before changing anything.

---

## 3. Architecture Summary

### Backend

- Language: C#
- Framework: .NET 8 / ASP.NET Core Web API
- Database: MariaDB
- Data access: Dapper
- Architecture: Clean Architecture
- Messaging/application flow: MediatR-based feature slices
- Real-time: WebSockets
- Email: MailKit

Backend layers must remain clearly separated:

- Domain
- Application
- Infrastructure
- Presentation/API

Do not blur boundaries between these layers.

### Frontend

- Framework: React
- Language: TypeScript
- Build tool: Vite
- Styling: Tailwind CSS
- API communication: Axios
- UI architecture: component-based, with atomic-ish organization already present in the repository

Frontend changes should favor:

- small reusable components
- safe typing
- clear props
- compositional design
- predictable state flow

---

## 4. Repository Rules

### 4.1 Dapper only for data access

Do not introduce Entity Framework or another ORM unless explicitly instructed.

### 4.2 Respect existing folder structure

The existing structure is intentional.

When adding files, place them in the corresponding backend/frontend locations according to current repository organization.

### 4.3 Do not manage git history

You must never run:

- `git commit`
- `git push`
- `git rebase`
- `git reset`
- `git checkout` to discard work

You may inspect git status or diffs if needed, but do not alter repository history.

### 4.4 Commit message output

When asked to prepare a commit message, write the proposed message into:

`COMMIT_MSG.tmp`

Use Conventional Commits.

Example:

- `feat: add month-aware expense editor`
- `fix: correct login token refresh handling`

Prefer single quotes inside the message text if quoting is needed.

### 4.5 Do not fix unrelated code

If you encounter unrelated pre-existing issues outside the task scope:

- do not fix them automatically
- report them clearly
- continue focusing only on the requested task unless instructed otherwise

### 4.6 Do not delete tests casually

Do not delete tests as cleanup.

If a test seems wrong or outdated, report it and only change or remove it if the task explicitly requires that.

---

## 5. Backend Rules

### 5.1 Preserve Clean Architecture

Keep concerns separated.

Examples:

- Domain should not depend on Infrastructure
- Controllers should stay thin
- Business logic belongs in the correct application/domain layer
- Data access should remain in repositories/infrastructure components

### 5.2 Follow existing feature slice conventions

Before creating a new handler, DTO, repository, query, command, validator, or controller endpoint:

- inspect an existing similar slice
- follow that structure closely

### 5.3 Transaction discipline matters

This codebase uses transaction patterns intentionally.

Be careful around:

- UnitOfWork behavior
- transactional commands
- repository methods that expect an active transaction
- command/query separation

Do not bypass existing transaction patterns casually.

### 5.4 SQL changes must be explicit

When writing or modifying SQL:

- keep it readable
- use explicit selected columns
- avoid sloppy wildcard queries unless already justified
- match current Dapper mapping conventions
- preserve MariaDB compatibility

### 5.5 Auth and security changes must be conservative

Be extra careful when working on:

- login
- token refresh
- JWT config
- cookies / auth headers
- WebSocket auth
- rate limits
- email verification
- session termination

Prefer diagnosis with evidence before changing security-related code.

### 5.6 Backend implementation behavior

For backend tasks, also follow the specialized backend instruction file if present.

That file may refine implementation style and backend decision-making, but it must not override the core repository rules in this `AGENTS.md`.

If there is a conflict:

- `AGENTS.md` wins on scope, safety, repository conventions, and operating rules
- the backend instruction file refines backend implementation only

---

## 6. Frontend Rules

### 6.1 Prefer safe, readable React

Write React that is:

- typed
- explicit
- composable
- easy to review

Avoid:

- unnecessary prop explosion
- hidden mutation
- overuse of `any`
- fragile effect chains
- large monolithic components when smaller units already exist

### 6.2 Match existing UI patterns

Before building UI:

- inspect related pages/components
- reuse existing UI primitives where possible
- preserve consistent spacing, structure, and interaction patterns

### 6.3 Financial UI must be readable

When showing money:

- use existing formatting utilities
- keep signs and totals clear
- preserve alignment/readability where relevant
- avoid ambiguous labels

### 6.4 Respect editable vs read-only states

The app has month lifecycle concepts and permissions.

Do not assume a screen is always editable.
Always inspect existing editability/read-only rules before implementing UI mutations.

### 6.5 Avoid unsafe UI invention

Do not invent backend behavior on the frontend.
UI must handle:

- loading states
- empty states
- partial data
- failed requests
- read-only states

### 6.6 Frontend design behavior

For frontend design and UI refinement tasks, also follow the specialized frontend UI instruction file if present.

That file may guide aesthetic and interaction quality, but it must not override the core repository rules in this `AGENTS.md`.

If there is a conflict:

- `AGENTS.md` wins on architecture, scope control, safety, and maintainability
- the frontend UI instruction file refines visual and interaction quality only

---

## 7. Testing Rules

### 7.1 Test locations

Backend tests are under the backend test project(s).

Use existing test structure and inherit from the established base classes where appropriate.

Examples already used in the repo include:

- `Backend.Tests/UnitTests/BaseClasses/UnitTestBase.cs`
- `Backend.Tests/IntegrationTests/BaseClasses/IntegrationTestBase.cs`

Follow the current conventions you find in the repository.

### 7.2 Do not run broad expensive test suites by default

Do not run the full test suite unless explicitly instructed.

Default rule:

- run only tests relevant to the files you changed
- run the narrowest possible build/test command that validates the task

### 7.3 Every new test should be intentional

If you add tests:

- keep them focused
- preserve them
- do not delete them casually afterward

### 7.4 Validate your own changes

If you change code, you are responsible for checking that your changes compile and that the directly related validation step passes.

---

## 8. Local Development Commands

These are the preferred local development workflows.

### 8.1 Dev database

From repo root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
docker compose --env-file .env.dev -f docker-compose.dev.yml ps

```

### 8.2 Backend run

From `Backend`:

```bash
DOTNET_USE_POLLING_FILE_WATCHER=true dotnet watch run --urls http://localhost:5001

```

### 8.3 Backend build

From `Backend`:

```bash
dotnet build

```

### 8.4 Frontend run

From `Frontend`:

```bash
npm install
npm run dev

```

### 8.5 Seeder via Docker

From repo root:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile seed run --rm seed-users

```

### 8.6 Seed locally

From `Backend.Tools`:

```bash
ALLOW_SEEDING=true DATABASESETTINGS__CONNECTIONSTRING="Server=127.0.0.1;Port=3306;Database=steenbudgetDEV;Uid=app;Pwd=apppwd;SslMode=None;GuidFormat=Binary16" \
dotnet run -- --email jane@doe.se --password 'ChangeMe123' --first Jane --last Doe

```

---

## 9. Standard Agent Workflow

For most tasks, follow this sequence.

### Step 1: Inspect

Read the relevant files and understand:

- current behavior
- entry points
- related DTOs / handlers / components / queries
- similar existing implementations

### Step 2: Plan

Produce a short plan:

- what is wrong or needed
- which files are likely affected
- smallest safe approach
- how success will be validated

### Step 3: Implement

Make the smallest coherent set of changes needed.

### Step 4: Validate

Use the narrowest reasonable validation:

- compile/build the changed area
- run only relevant tests
- verify no obvious type/runtime issues were introduced

### Step 5: Report

Summarize:

- what changed
- why
- how it was validated
- any remaining risk or follow-up

---

## 10. Troubleshooting Workflow

When debugging issues such as 401 login failures, broken DTO flows, invalid queries, or frontend/backend mismatches:

### First inspect:

- backend endpoint/controller/handler path
- frontend API call
- DTO request/response shape
- auth config / token / cookie behavior
- environment values
- logs and error output
- relevant middleware
- seed data assumptions

### Then state:

- likely root cause
- evidence for that conclusion
- minimal fix

Do not start by applying speculative fixes.

---

## 11. Allowed vs Not Allowed Behavior

### Allowed

- inspect files
- search the repo
- explain root cause
- propose focused changes
- edit relevant files
- run narrow build/test commands
- produce commit message text when asked

### Not allowed

- broad autonomous rewrites
- unrelated cleanup
- changing repository history
- adding new frameworks casually
- replacing Dapper
- running full expensive test suites by default
- making speculative architecture changes without evidence
- silently fixing unrelated problems

---

## 12. Definition of Done

A task is done only when:

- the requested scope is implemented or the root cause is clearly diagnosed
- changes are limited to the relevant area
- code follows repository conventions
- changed code compiles
- directly relevant validation has been performed
- the result is understandable to the human developer

---

## 13. When Unsure

If the task is ambiguous:

- prefer the smallest safe interpretation
- inspect similar existing code
- avoid inventing behavior
- surface assumptions clearly

If a decision affects architecture, security, financial correctness, or many files, be conservative.

The human developer values understanding and control more than maximum automation.
