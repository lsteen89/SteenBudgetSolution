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
