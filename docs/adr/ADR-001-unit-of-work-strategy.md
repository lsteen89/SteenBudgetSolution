# ADR-001: Unit of Work Strategy

| Date       | Status                    | Owner   |
| ---------- | ------------------------- | ------- |
| 2025-07-19 | Accepted – In Progress | Linus Steen |

## 1. Context

Originally, database operations were executed ad‑hoc per repository method: each method opened its own connection and controlled its own transaction (or none). Problems observed:

* Inconsistent transaction boundaries across wizard steps.
* Potential for partial commits (some steps persisted, later ones failed).
* Harder to test (no shared connection/transaction injection seam).
* Mixing of concerns: domain logic entangled with persistence plumbing.
* Repetitive boilerplate (open connection, start/commit transaction).

The budget *finalization* workflow must treat multiple step outputs (income, expenses, savings, later debts) as an all‑or‑nothing atomic operation.

## 2. Decision

Adopt an explicit **Unit of Work (UoW)** abstraction that wraps a single `DbConnection` and `DbTransaction` for the lifespan of the finalize operation.

```csharp
public interface IUnitOfWork : IDisposable
{
    DbConnection Connection { get; }
    DbTransaction Transaction { get; }
    void BeginTransaction();
    void Commit();
    void Rollback();
}
```

**Rules**

* The wizard orchestrator creates one UoW per finalize request.
* Each step processor works only through repositories that use the UoW’s `Connection` + `Transaction`.
* Repositories and SQL executors do **not** open/close connections or begin their own transactions.
* Any processor failure → orchestrator triggers `Rollback()` and returns an error result.
* On success after all steps → orchestrator calls `Commit()`.

## 3. Alternatives Considered

| Alternative                       | Drawbacks                                                        |
| --------------------------------- | ---------------------------------------------------------------- |
| Ad-hoc transactions per step      | Allows partial persistence; step ordering & rollback complexity. |
| Ambient `TransactionScope`        | Less explicit; harder to test & reason about boundaries.         |
| Event-driven eventual consistency | Overkill at current scale; increased latency & complexity.       |
| Single big "God" repository       | Tight coupling and poor separation of concerns.                  |

## 4. Consequences

**Positive**

* Atomic multi-step finalization (clear “all succeed or none” semantics).
* Improved testability (inject mock repos using a shared transaction).
* Central place for future cross-cutting features (logging, timing, metrics).
* Reduced duplication of connection management logic.

**Negative**

* Requires migration of existing legacy code to comply.
* Slight initial boilerplate (explicit begin/commit in orchestrator).

**Neutral / Deferred**

* No built-in optimistic concurrency yet (can be added later).
* Distributed transaction needs (across services) not addressed—out of scope.

## 5. Implementation Notes

* Wizard orchestrator: `BeginTransaction()` → loop processors → `Commit()` or `Rollback()`.
* Processors: pure application logic (deserialize → map → repository calls).
* Repositories: assume active transaction; optionally throw/log if missing (safeguard).
* Legacy transaction runner: marked `[Obsolete]` and scheduled for removal once no references remain.

## 6. Invariants & Guardrails

| Invariant                                 | Enforcement                                              |
| ----------------------------------------- | -------------------------------------------------------- |
| Single active transaction during finalize | Orchestrator pattern & tests                             |
| No repository opens its own connection    | Code review + static search; future Roslyn rule possible |
| Rollback on first failure                 | Orchestrator short-circuits loop                         |
| Connection disposed after finalize        | `IUnitOfWork.Dispose()` in a `finally` block             |

## 7. Metrics & Observability (Planned)

* Log fields: `correlationId`, `budgetId`, `transactionDurationMs`, `result=Commit|Rollback`.
* Counter: `wizard.finalize.commits`, `wizard.finalize.rollbacks`.
* Timer: finalize end-to-end duration (for SLO baseline).

*(Details to be formalized in ADR-004 Observability Strategy.)*

## 8. Migration Plan

1. Introduce UoW interface & concrete implementation.
2. Update orchestrator to wrap finalize in UoW lifecycle.
3. Refactor repositories to remove direct connection creation.
4. Mark old helpers `[Obsolete]`.
5. Remove obsolete helpers after all references eliminated & tests green.

## 9. Risks & Mitigations

| Risk                                        | Mitigation                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| Partial migration leaves mixed patterns     | Phase 1 checklist: block merge until all repos migrated.                       |
| Silent usage of old helpers                 | CI grep / build fail on obsolete usage (treat warnings as errors temporarily). |
| Hidden performance issue (long transaction) | Add timing log + consider chunking if needed later.                            |

## 10. Follow-Ups

* ADR-004: Observability (structured logging & correlation ID).
* Add optional retry (Polly) around transaction start (ADR-007 Resilience).
* Implement safeguard: warning log if repository used outside active UoW (optional).

## 11. Status

| Item                           | State       |
| ------------------------------ | ----------- |
| UoW interface & implementation | In progress |
| Orchestrator using UoW         | In progress |
| Repositories migrated          | Partial     |
| Obsolete helpers removed       | Pending     |
| Tests updated                  | Partial     |

## 12. References

* Fowler, *Patterns of Enterprise Application Architecture* – Unit of Work.
* Internal commit: `refactor(wizard): introduce IUnitOfWork` (placeholder).

**Decision:** Proceed with explicit Unit of Work; finalize migration before adding advanced resilience layers.
