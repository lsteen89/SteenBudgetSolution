namespace Backend.Infrastructure.Repositories.Budget.Audit;

public sealed partial class BudgetAuditWriter
{
    private const string InsertConfigChangeEvent = @"
    INSERT INTO BudgetConfigChangeEvent
    (
        Id,
        BudgetId,
        EntityType,
        EntityId,
        ChangeType,
        BeforeJson,
        AfterJson,
        MetadataJson,
        ChangedAt,
        ChangedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetId,
        @EntityType,
        @EntityId,
        @ChangeType,
        @BeforeJson,
        @AfterJson,
        @MetadataJson,
        @ChangedAt,
        @ChangedByUserId
    );";

    private const string InsertLifecycleEvent = @"
    INSERT INTO BudgetMonthLifecycleEvent
    (
        Id,
        BudgetMonthId,
        EventType,
        RelatedBudgetMonthId,
        CarryOverMode,
        CarryOverAmount,
        MetadataJson,
        OccurredAt,
        OccurredByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @EventType,
        @RelatedBudgetMonthId,
        @CarryOverMode,
        @CarryOverAmount,
        @MetadataJson,
        @OccurredAt,
        @OccurredByUserId
    );";
}
