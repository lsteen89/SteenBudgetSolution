# Product Roadmap

> **Status Legend:**  
> ☐ = Not Started · ⏳ = In Progress · ✅ = Done · ❗ = Blocked / Needs Decision

---

## Phase 1 – Wizard Hardening (Finalize Onboarding Data Flow)

**Goal:** Reliable ingestion → normalized DB; legacy patterns removed.

### Checklist
- [⏳] Refactor all step processors to unified pattern (deserialize → map → persist → uniform failure message)
- [✅] Income processor aligned (monthly normalization + tests)
- [✅] Savings processor finalized & tested
- [✅] Expense flattening (ExpenseItem model) completed
- [⏳] Remove obsolete Utilities / old Expenditure entities
- [⏳] Remove old transaction runner (`ITransactionRunner`) usages
- [⏳] Standardize `FailureMsgHelper` adoption everywhere
- [⏳] Add rounding & zero-filter tests (Income / Expense / Savings)
- [✅] Delete Newtonsoft remnants and unused helpers
- [⏳] Confirm DTO ↔ Domain mapping parity (test pass)
- [⏳] ADR-001 (Unit of Work) written
- [⏳] ADR-002 (Unified Expense Flattening) written
- [⏳] ADR-003 (Income Normalization) written

**Exit Criteria:** All processors green in unit tests, no obsolete APIs referenced, ADRs merged.

---

## Phase 2 – Observability Foundation

**Goal:** Trace every request; basic health & metrics in place.

### Checklist
- [ ] Correlation ID middleware (`X-Correlation-Id`) + log scope
- [ ] Structured JSON logging (Serilog or built-in)
- [ ] Log enrichment: correlationId, budgetId, stepNumber
- [ ] Error code taxonomy doc (e.g. WZ001, MAP001, DB001)
- [ ] Health endpoints (`/health/live`, `/health/ready`)
- [ ] Basic counters (wizard finalize success/failure)
- [ ] Execution timing (finalize duration logged)
- [ ] ADR-004 (Observability Strategy)

**Exit Criteria:** Can filter logs by correlationId; health returns 200; metrics counters visible/logged.

---

## Phase 3 – Core Budget MVP

**Goal:** Deliver immediate post-onboarding value (summary/dashboard).

### Checklist
- [ ] Read-only query layer (separate from write model)
- [ ] Summary API: total income, total expenses, net, savings rate
- [ ] Category breakdown API (expense aggregates)
- [ ] Savings goal progress API
- [ ] React dashboard cards (Net, Income, Expenses, Savings Rate)
- [ ] Integration test: finalize → summary endpoints
- [ ] Performance log: summary endpoint p95 captured
- [ ] ADR-005 (Query Layer vs Command Layer)

**Exit Criteria:** Dashboard renders real aggregated values; tests pass.

---

## Phase 4 – Analytics I (Trends & Projections)

**Goal:** Insight & forward-looking guidance.

### Checklist
- [ ] FrequencyConversion tests hardened
- [ ] Burn rate / runway calculator (months to goal)
- [ ] Goal progress % in dashboard
- [ ] Simple trend line (seed monthly snapshot if needed)
- [ ] Snapshot writer job (manual trigger for now)
- [ ] React charts (net trend, savings progress)
- [ ] API: projected goal completion date
- [ ] ADR-006 (Snapshots & Trend Rationale)

**Exit Criteria:** Trend & projections visible; snapshot table populated.

---

## Phase 5 – Resilience & Quality

**Goal:** Graceful degradation & reliability under transient faults.

### Checklist
- [ ] Polly retry policy for transient DB exceptions
- [ ] (Optional placeholder) Circuit breaker for future external services
- [ ] Docker compose integration test environment (MariaDB)
- [ ] Integration tests: finalize + summary + expense flatten end-to-end
- [ ] Index audit (BudgetId, CategoryId, IncomeId, foreign keys)
- [ ] Performance benchmarking (finalize p95 baseline)
- [ ] Logging of retries (warn on final attempt)
- [ ] ADR-007 (Resilience Strategy)

**Exit Criteria:** Integration tests green locally; retries observable; baseline perf recorded.

---

## Phase 6 – Security & Ops Hardening

**Goal:** Production readiness for secrets, auth, recovery.

### Checklist
- [ ] Secret rotation procedure doc (dev & prod)
- [ ] Password hashing audit (Argon2/bcrypt) verification
- [ ] Token (refresh/access) validation rules documented
- [ ] Basic authorization matrix (roles/claims) stub
- [ ] Backup & restore script tested (simulate restore)
- [ ] Audit trail table for critical changes (goals/debts)
- [ ] Dependency vulnerability scan (CI)
- [ ] ADR-008 (Security & Secrets Approach)

**Exit Criteria:** Successful backup/restore dry run; security doc updated.

---

## Phase 7 – UX / Design Polish

**Goal:** Trust, usability & accessibility.

### Checklist
- [ ] Apply design feedback (spacing, typography, colors)
- [ ] Responsive layout polish (mobile breakpoints)
- [ ] Accessibility pass (focus states, aria labels, contrast)
- [ ] Skeleton loaders for dashboard panels
- [ ] Error + empty states (friendly copy)
- [ ] Light performance tweak (code split large bundles)
- [ ] UX regression test checklist (manual)

**Exit Criteria:** A11y score ≥ target; no glaring mobile issues.

---

## Phase 8 – Launch Preparation

**Goal:** Clear, repeatable release process.

### Checklist
- [ ] SLO definition (e.g. finalize < 1.5s p95, 99% uptime)
- [ ] Error budget policy documented
- [ ] Final schema migration script & dry run
- [ ] Release / rollback runbook
- [ ] Ops README (deploy steps, env variables)
- [ ] Logging PII audit
- [ ] Final QA checklist executed
- [ ] ADR-009 (Launch Strategy)

**Exit Criteria:** Runbook + migration tested; sign-off checklist complete.

---

## Phase 9 – Debts Module

**Goal:** Integrate liabilities for full financial picture.

### Checklist
- [ ] Debt DTOs (principal, interest rate, payment frequency)
- [ ] Domain model (normalized monthly payment)
- [ ] Mapping + tests (frequency conversion)
- [ ] Persistence schema (Debt, optional payment history)
- [ ] CRUD endpoints
- [ ] Dashboard integration (net after debt service)
- [ ] Projection: time to payoff (simple amortization)
- [ ] Integration tests

**Exit Criteria:** Debt impacts summary & projections accurately.

---

## Phase 10 – Rules & Alerts

**Goal:** Proactive user guidance.

### Checklist
- [ ] Rule engine v1 (pluggable conditions)
- [ ] Negative net consecutive months rule
- [ ] Savings goal behind schedule rule
- [ ] Email notification integration (SMTP)
- [ ] Rule suppression / snooze support
- [ ] Alert delivery log
- [ ] ADR-010 (Rules Engine Design)

**Exit Criteria:** Test alert triggers & email delivery.

---

## Phase 11 – Historical & Export

**Goal:** Longitudinal analysis & data portability.

### Checklist
- [ ] Monthly snapshot scheduler (automated)
- [ ] Snapshot retrieval API
- [ ] CSV export (income, expenses, debts)
- [ ] Download endpoint + auth check
- [ ] Retention policy doc (snapshot pruning)
- [ ] Performance index for snapshot queries

**Exit Criteria:** User can export CSV & view historical trend curves.

---

## Phase 12 – Growth / Optimization Cycle

**Goal:** Continuous improvements & scalability.

### Checklist
- [ ] Query performance tuning (analyze slow logs)
- [ ] Caching layer decision (e.g. Redis) – ADR if adopted
- [ ] Feature flag system (simple DB or config-driven)
- [ ] Additional notifications (push/webhooks placeholder)
- [ ] Advanced categorization (heuristic or ML stub)
- [ ] A/B testing scaffold
- [ ] Third-party integration backlog triage

**Exit Criteria:** At least one optimization delivered & feature flag scaffold in place.

---

## Continuous Swimlanes (Ongoing)

### Documentation
- [ ] Keep ADR index updated
- [ ] Architecture diagram updates when topology changes

### Testing
- [ ] New domain logic always accompanied by unit tests
- [ ] Integration test suite run before tagging release

### DevOps
- [ ] Dependency updates monthly
- [ ] Security scan in CI
- [ ] Review logs for anomaly weekly

### Technical Debt
- [ ] Maintain /docs/debt.md
- [ ] Triage & prune each phase boundary

---

## Backlog / Parking Lot

- [ ] Shared budgets / multi-user permissions
- [ ] Rule configuration UI
- [ ] Advanced anomaly detection
- [ ] Budget templates marketplace
- [ ] AI-assisted expense categorization
- [ ] Mobile PWA enhancements
- [ ] Real-time push notifications
- [ ] Multi-currency support

---

## Immediate Next Actions (Phase 1 Kickoff)

- [⏳] Align all processors to unified pattern
- [⏳] Remove transaction runner usages
- [⏳] Add missing rounding tests
- [⏳] Draft ADR-002
- [⏳] Commit baseline before observability changes

---

## ADR Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Unit of Work Strategy | ☐ |
| ADR-002 | Unified Expense Flattening | ☐ |
| ADR-003 | Income Normalization | ☐ |
| ADR-004 | Observability Strategy | ☐ |
| ADR-005 | Query vs Command Layer | ☐ |
| ADR-006 | Snapshots & Trends | ☐ |
| ADR-007 | Resilience Strategy | ☐ |
| ADR-008 | Security & Secrets | ☐ |
| ADR-009 | Launch Strategy | ☐ |
| ADR-010 | Rules Engine Design | ☐ |

---

