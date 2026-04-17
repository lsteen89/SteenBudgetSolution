namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;

public sealed partial class BudgetMonthChangeEventRepository
{
    private const string InsertChangeEvent = @"
    INSERT INTO BudgetMonthChangeEvent
    (
        Id,
        BudgetMonthId,
        EntityType,
        EntityId,
        SourceEntityId,
        ChangeType,
        ChangeSetJson,
        ChangedAt,
        ChangedByUserId
    )
    VALUES
    (
        @Id,
        @BudgetMonthId,
        @EntityType,
        @EntityId,
        @SourceEntityId,
        @ChangeType,
        @ChangeSetJson,
        @ChangedAt,
        @ChangedByUserId
    );";
}