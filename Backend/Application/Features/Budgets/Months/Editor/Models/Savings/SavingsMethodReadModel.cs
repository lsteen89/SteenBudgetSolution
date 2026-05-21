namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

// Read projection for a plan-level savings method row. `MethodCode` is the
// stable system code; `CustomLabel` is only populated for `custom` rows.
// Read-only by design — writes go through dedicated command models.
public sealed class SavingsMethodReadModel
{
    public Guid Id { get; init; }
    public string MethodCode { get; init; } = string.Empty;
    public string? CustomLabel { get; init; }
}
