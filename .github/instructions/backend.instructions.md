---
applyTo: "Backend/**/*.{cs,sql,json}"
---

# Backend Agent Instructions

This file defines how AI coding agents should operate when working on the backend in this repository.

It does **not** replace `AGENTS.md`.
It complements it.

If there is any conflict:

- `AGENTS.md` wins
- this file refines backend implementation behavior only

The goal is backend work that is:

- production-grade
- explicit
- safe
- testable
- maintainable
- aligned with existing repository architecture

This codebase handles financial data and user-facing budgeting workflows.
Correctness and clarity matter more than cleverness.

---

## 1. Backend Intent

The backend must feel:

- predictable
- explicit
- stable
- boring in the best possible way
- easy to reason about
- safe to change incrementally

Do not optimize for novelty.
Do not optimize for abstraction density.
Do not optimize for “smart” code.

Prefer code that a human developer can inspect quickly and trust.

---

## 2. Architectural Ground Rules

### 2.1 Preserve Clean Architecture

Respect the existing boundaries between:

- Domain
- Application
- Infrastructure
- Presentation

Do not blur these boundaries.

Examples:

- Domain must not depend on Infrastructure
- Controllers must stay thin
- Business rules must not be hidden in controllers
- Data access belongs in repositories/infrastructure
- DTO shaping should follow existing application/presentation patterns

### 2.2 Follow existing feature slice conventions

Before adding or changing:

- commands
- queries
- handlers
- validators
- DTOs
- repository methods
- endpoints

inspect a nearby similar implementation first.

Match:

- folder structure
- naming
- request/response flow
- result/error conventions
- validation style
- transaction style

Do not invent a parallel architecture when an acceptable repository pattern already exists.

### 2.3 Smallest safe change wins

Always prefer:

- focused changes
- local reasoning
- minimal surface area
- incremental implementation

Avoid:

- broad rewrites
- opportunistic refactors
- speculative abstractions
- “while I’m here” architectural cleanup

---

## 3. Financial Correctness Rules

This application handles budgeting and financial data.

Be conservative around:

- monthly totals
- income/expense aggregation
- debt payment calculations
- savings calculations
- carry-over logic
- budget month state transitions
- snapshot values
- editable vs read-only month behavior
- currency-related values and formatting assumptions

When changing financial logic:

1. inspect current flow first
2. identify where the source of truth actually lives
3. preserve existing invariants
4. validate assumptions against nearby code/tests

Do not guess.

If logic spans multiple layers, trace it end-to-end before changing anything.

---

## 4. Data Access Rules

### 4.1 Dapper only

This repository uses Dapper intentionally.

Do not introduce:

- Entity Framework
- another ORM
- repository generators
- query builders that fight existing patterns

### 4.2 SQL must be explicit

When writing or changing SQL:

- select explicit columns
- keep aliases readable
- preserve MariaDB compatibility
- match current Dapper mapping expectations
- avoid wildcard selects unless already justified
- keep joins understandable
- keep mutation statements explicit and reviewable

Prefer readable SQL over compressed SQL.

### 4.3 Repository methods should stay honest

Repository methods should:

- do what their name says
- return data at the right abstraction level
- avoid hidden side effects
- avoid mixing too many responsibilities

Do not create vague repository methods like:

- `HandleStuffAsync`
- `SaveDataAsync`
- `GetEverythingAsync`

Use names that describe the real intent.

### 4.4 Respect the real source of truth

Before changing reads or writes, confirm whether the source of truth is:

- baseline/default budget data
- month-specific materialized data
- snapshots for closed months
- derived projection logic

Do not accidentally read baseline data when month-specific data is authoritative.

Do not accidentally mutate data that should be treated as historical or snapshot-based.

---

## 5. Transaction and Request Pipeline Discipline

### 5.1 Respect transaction boundaries

This codebase uses transaction patterns intentionally.

Be careful around:

- UnitOfWork
- transaction pipeline behaviors
- repository methods that require an active transaction
- transactional commands vs read-only queries

Do not bypass transaction discipline casually.

### 5.2 Diagnose transaction issues properly

If a repository method throws because there is no active DB transaction:

- do not patch around it blindly
- inspect whether the request belongs in a transactional command flow
- inspect pipeline registration
- inspect whether the method is being called from the wrong place
- inspect similar working handlers first

Do not “fix” transaction errors by weakening guarantees unless explicitly instructed.

### 5.3 Command/query separation should stay clear

Prefer:

- queries for reads
- commands for mutations
- explicit handlers
- explicit outcomes

Do not hide writes inside read handlers.
Do not add side effects to query flows unless there is an established, intentional pattern.

---

## 6. API and DTO Rules

### 6.1 Keep controllers thin

Controllers should mainly:

- receive input
- delegate to the application layer
- translate result to HTTP response
- remain easy to inspect

Do not move business logic into controllers.

### 6.2 DTOs should be explicit

DTOs must be:

- clearly named
- narrowly scoped
- easy to map
- stable enough for their endpoint purpose

Avoid:

- bloated catch-all DTOs
- reusing one DTO for unrelated endpoints
- exposing infrastructure concerns to API consumers

### 6.3 Match existing envelope/result patterns

Before returning new responses or errors:

- inspect how the project currently handles results
- match the current response envelope and failure style
- stay consistent with existing controller helpers and conventions

Do not invent a new response format in one slice.

### 6.4 Validate inputs conservatively

For requests involving:

- dates
- month identifiers
- currency-like numeric values
- ids
- auth-sensitive operations
- state transitions

validate explicitly and early.

Do not rely on wishful parsing.

---

## 7. Auth, Security, and User-Sensitive Flows

Be extra conservative when working on:

- login
- refresh tokens
- JWTs
- cookies
- identity/session termination
- email verification
- password reset
- WebSocket auth
- role/permission checks
- user data isolation

Rules:

- inspect the current flow before changing anything
- do not relax checks casually
- do not infer security behavior from frontend assumptions
- preserve least surprise
- preserve explicitness

If the issue is unclear, diagnose first and state evidence before proposing a fix.

---

## 8. Time, Dates, and Lifecycle Rules

This backend appears to contain month-aware lifecycle logic.

Be careful with:

- `YYYY-MM` parsing/validation
- current month defaults
- month creation/bootstrap logic
- closing/opening periods
- skipped months
- snapshot timing
- local vs UTC assumptions
- deterministic time in tests

Do not spread ad hoc date parsing throughout the code.
Match the established patterns already present in the repository.

When tests depend on time, prefer the existing fake/deterministic time patterns.

---

## 9. Error Handling Rules

### 9.1 Fail clearly

Prefer errors that are:

- explicit
- localizable if needed
- consistent with current patterns
- easy for the frontend to handle

Avoid:

- vague exception messages
- silent null returns where failure should be explicit
- broad catch blocks that hide real issues

### 9.2 Do not use exceptions as routine control flow

Use the repository’s established result/error patterns where appropriate.

Exceptions should generally represent:

- unexpected failures
- infrastructure problems
- violated assumptions that should not happen in normal flow

### 9.3 Preserve useful diagnostics

When changing code paths that currently provide useful logs or clear errors, do not remove that diagnostic value casually.

---

## 10. Testing Behavior

### 10.1 Match existing test style

Before adding tests, inspect nearby tests and match:

- structure
- naming
- fixture style
- seed style
- assertions
- test base class usage

### 10.2 Prefer focused validation

Do not run the whole universe by default.

Prefer:

- narrow builds
- targeted tests
- the smallest relevant validation for the change

### 10.3 Add tests where risk justifies it

Strong candidates for tests:

- budget month lifecycle behavior
- financial aggregation logic
- repository query correctness
- command handler mutations
- API contract changes
- auth-sensitive behavior
- regression fixes

### 10.4 Do not casually rewrite tests to fit broken code

If a test fails:

- determine whether the test is wrong or the code is wrong
- inspect similar tests and business intent
- report ambiguity clearly

Do not simply bend tests to pass.

---

## 11. Implementation Style

### 11.1 Prefer explicit code

Write code that is:

- readable
- named well
- direct
- easy to debug

Avoid:

- nested cleverness
- over-general helper layers
- vague abstractions
- prematurely reusable plumbing
- heavily compressed LINQ that hides business intent

### 11.2 Good names matter

Use names that describe the real domain meaning.

Prefer:

- `GetBudgetMonthEditorQuery`
- `CloseOpenMonthWithSnapshotAsync`
- `EnsureAccessibleMonthAsync`

Avoid names that hide intent.

### 11.3 Local reasoning first

A reader should be able to understand a handler or repository method without chasing ten layers of indirection.

Do not extract trivial logic into helpers just to make a file shorter.

---

## 12. Backend Design Priorities For This Repo

When making implementation decisions, prioritize in this order:

1. correctness
2. consistency with existing architecture
3. readability
4. transaction safety
5. testability
6. performance
7. abstraction

Performance matters, but not at the cost of making financial logic opaque.

---

## 13. When Working On Existing Features

Before changing an existing backend slice, inspect:

- controller endpoint
- request DTO / query / command
- handler
- repository calls
- related domain logic
- related tests
- similar adjacent feature slices

Then choose the smallest safe fix.

Do not start by rewriting the slice.

---

## 14. When Adding New Backend Features

When adding a feature, prefer this shape unless existing conventions indicate otherwise:

1. request model / DTO
2. command or query
3. handler
4. validator if applicable
5. repository additions
6. endpoint/controller wiring
7. focused tests

Keep the responsibilities separated and obvious.

---

## 15. What Not To Do

Do not:

- introduce a new backend pattern casually
- add infrastructure shortcuts into application/domain
- bypass transaction rules
- use broad generic repositories
- add ORM-style behavior
- hide business logic in mapping code
- couple controller code directly to SQL concerns
- perform unrelated cleanup
- silently change financial behavior
- relax auth/security behavior without evidence

---

## 16. Definition of Good Backend Work

Good backend work in this repository is:

- small in scope
- easy to review
- explicit in intent
- aligned with current patterns
- safe for financial workflows
- validated with focused checks
- understandable by the human developer later

If forced to choose between “clever” and “clear”, choose clear.
If forced to choose between “generic” and “specific”, choose specific.
If forced to choose between “faster to write” and “safer to maintain”, choose safer to maintain.
