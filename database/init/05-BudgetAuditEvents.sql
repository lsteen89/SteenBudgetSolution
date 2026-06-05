-- ##################################################################
-- # 05: Budget audit event tables
-- ##################################################################

CREATE TABLE BudgetConfigChangeEvent (
    Id                  BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId            BINARY(16)    NOT NULL,

    EntityType          VARCHAR(80)   NOT NULL,
    EntityId            BINARY(16)    NULL,
    ChangeType          VARCHAR(40)   NOT NULL,

    BeforeJson          JSON          NULL,
    AfterJson           JSON          NULL,
    MetadataJson        JSON          NULL,

    ChangedAt           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ChangedByUserId     BINARY(16)    NOT NULL,

    CONSTRAINT FK_BudgetConfigChangeEvent_Budget
        FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetConfigChangeEvent_User
        FOREIGN KEY (ChangedByUserId) REFERENCES Users(Persoid) ON DELETE RESTRICT,

    INDEX IX_BudgetConfigChangeEvent_BudgetId_ChangedAt (BudgetId, ChangedAt),
    INDEX IX_BudgetConfigChangeEvent_EntityType_EntityId (EntityType, EntityId),
    INDEX IX_BudgetConfigChangeEvent_ChangedByUserId (ChangedByUserId)
) ENGINE=InnoDB;

CREATE TABLE BudgetMonthLifecycleEvent (
    Id                      BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetMonthId           BINARY(16)    NOT NULL,

    EventType               VARCHAR(50)   NOT NULL,
    RelatedBudgetMonthId    BINARY(16)    NULL,
    CarryOverMode           VARCHAR(10)   NULL,
    CarryOverAmount         DECIMAL(18,2) NULL,
    MetadataJson            JSON          NULL,

    OccurredAt              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OccurredByUserId        BINARY(16)    NOT NULL,

    CONSTRAINT FK_BudgetMonthLifecycleEvent_BudgetMonth
        FOREIGN KEY (BudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE CASCADE,

    CONSTRAINT FK_BudgetMonthLifecycleEvent_RelatedBudgetMonth
        FOREIGN KEY (RelatedBudgetMonthId) REFERENCES BudgetMonth(Id) ON DELETE SET NULL,

    CONSTRAINT FK_BudgetMonthLifecycleEvent_User
        FOREIGN KEY (OccurredByUserId) REFERENCES Users(Persoid) ON DELETE RESTRICT,

    INDEX IX_BudgetMonthLifecycleEvent_BudgetMonthId_OccurredAt (BudgetMonthId, OccurredAt),
    INDEX IX_BudgetMonthLifecycleEvent_EventType (EventType),
    INDEX IX_BudgetMonthLifecycleEvent_RelatedBudgetMonthId (RelatedBudgetMonthId),
    INDEX IX_BudgetMonthLifecycleEvent_OccurredByUserId (OccurredByUserId)
) ENGINE=InnoDB;

-- ##################################################################
-- # Debt PR 3: structured balance-adjustment history
-- ##################################################################
-- Records every manual `Uppdatera saldo` on a debt from the editor. Kept
-- distinct from `BudgetMonthChangeEvent` (which captures month-row mutations
-- like planned-payment edits) so future progress / recap reads can query
-- balance deltas directly, without parsing arbitrary JSON.
--
-- Invariants enforced here, not in application code:
--   * Scope must be one of the three editor scopes (matches
--     `BudgetMonthDebtEditScopes` constants).
--   * `OldBalance` and `NewBalance` are non-negative; a balance is a
--     liability snapshot, never a signed quantity.
--   * `Delta = NewBalance - OldBalance` (the application writes the value;
--     no DB-side `GENERATED` column to keep MariaDB-portable).
--
-- Linkage columns are nullable so a single event row can describe either
-- side of a scoped adjustment:
--   * currentMonthOnly        → `BudgetMonthDebtId` + `BudgetMonthId` set,
--                                `DebtId` NULL.
--   * budgetPlanOnly          → `DebtId` set, month-side columns NULL.
--   * currentMonthAndBudgetPlan → one event row per side that actually
--                                  moved (no-op sides write nothing); each
--                                  row stores its own old/new pair because
--                                  the two sides can legitimately diverge.
--
-- Planned-payment edits never write here (they live in `BudgetMonthChangeEvent`
-- with `EntityType = 'debt'`). PR 4's `mark-paid-off` command will reuse this
-- insert path when the optional `SetBalanceToZero` branch fires, so balance
-- and lifecycle stay auditable as separate facts.
CREATE TABLE DebtBalanceEvent (
    Id                  BINARY(16)    NOT NULL PRIMARY KEY,
    BudgetId            BINARY(16)    NOT NULL,
    DebtId              BINARY(16)    NULL,
    BudgetMonthDebtId   BINARY(16)    NULL,
    BudgetMonthId       BINARY(16)    NULL,

    OldBalance          DECIMAL(18,2) NOT NULL,
    NewBalance          DECIMAL(18,2) NOT NULL,
    Delta               DECIMAL(18,2) NOT NULL,
    Scope               VARCHAR(50)   NOT NULL,
    Note                VARCHAR(500)  NULL,

    ChangedAt           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ChangedByUserId     BINARY(16)    NOT NULL,

    -- FK strategy for this audit table:
    --   * BudgetId     → CASCADE so a full account deletion (GDPR) removes its
    --                    audit history.
    --   * ChangedByUserId → RESTRICT so a user with audit history cannot be
    --                       silently hard-deleted.
    --   * DebtId / BudgetMonthDebtId / BudgetMonthId → no FK on purpose. Audit
    --     rows are value references (snapshots of what the row pointed at when
    --     the event happened) and must survive even if the referenced row is
    --     later removed; that is the whole point of a history table. As a
    --     side benefit, MariaDB rejects CHECK constraints that reference
    --     columns covered by `ON DELETE SET NULL` foreign keys (error 1901),
    --     so the linkage-shape CHECK below would not even parse if these
    --     three columns carried FKs.
    CONSTRAINT FK_DebtBalanceEvent_Budget
        FOREIGN KEY (BudgetId) REFERENCES Budget(Id) ON DELETE CASCADE,

    CONSTRAINT FK_DebtBalanceEvent_User
        FOREIGN KEY (ChangedByUserId) REFERENCES Users(Persoid) ON DELETE RESTRICT,

    CONSTRAINT CK_DebtBalanceEvent_Scope
        CHECK (Scope IN ('currentMonthOnly','currentMonthAndBudgetPlan','budgetPlanOnly')),

    CONSTRAINT CK_DebtBalanceEvent_NonNegative
        CHECK (OldBalance >= 0 AND NewBalance >= 0),

    -- Audit invariant: the explicit Delta column must match the computed
    -- difference. The application always writes `NewBalance - OldBalance`,
    -- but a bug or a future code path that builds the row by hand cannot
    -- silently drift the audit history.
    CONSTRAINT CK_DebtBalanceEvent_Delta
        CHECK (Delta = NewBalance - OldBalance),

    -- Linkage shape is exactly one of two:
    --   * plan-side event  → DebtId set, both month columns NULL
    --   * month-side event → BudgetMonthDebtId and BudgetMonthId set, DebtId NULL
    -- Rules out malformed rows with no linkage (orphan events) and rows
    -- with both kinds of linkage (which would double-count in
    -- "what happened to this debt" vs "what happened to this month row"
    -- queries).
    CONSTRAINT CK_DebtBalanceEvent_Linkage
        CHECK (
            (DebtId IS NOT NULL AND BudgetMonthDebtId IS NULL AND BudgetMonthId IS NULL)
            OR
            (DebtId IS NULL AND BudgetMonthDebtId IS NOT NULL AND BudgetMonthId IS NOT NULL)
        ),

    INDEX IX_DebtBalanceEvent_DebtId_ChangedAt (DebtId, ChangedAt),
    INDEX IX_DebtBalanceEvent_BudgetMonthDebtId (BudgetMonthDebtId),
    INDEX IX_DebtBalanceEvent_BudgetMonthId (BudgetMonthId),
    INDEX IX_DebtBalanceEvent_BudgetId_ChangedAt (BudgetId, ChangedAt),
    INDEX IX_DebtBalanceEvent_ChangedByUserId (ChangedByUserId)
) ENGINE=InnoDB;
