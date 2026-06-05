namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Debt PR 5: SELECT shape for the recent `BudgetMonthChangeEvent` rows
// surfaced on `BudgetMonthDebtEditorDto.RecentEvents`. The repository
// extracts `ChangeSetJson.action` server-side via MariaDB's
// `JSON_UNQUOTE(JSON_EXTRACT(...))` so the application layer never has to
// parse arbitrary JSON for display purposes.
public sealed class DebtEditorRecentEventReadModel
{
    public Guid Id { get; init; }
    public Guid EntityId { get; init; }
    public Guid? SourceEntityId { get; init; }
    public string EntityType { get; init; } = string.Empty;
    public string ChangeType { get; init; } = string.Empty;
    public string? Action { get; init; }
    public DateTime ChangedAt { get; init; }
}
