namespace Backend.Application.DTO.Budget.Months.Editor;

/// <summary>
/// One row in a transactional bulk patch of budget month expense items.
/// Mirrors <see cref="PatchBudgetMonthExpenseItemRequestDto"/> plus the row id.
/// </summary>
public sealed record PatchBudgetMonthExpenseItemBulkRowDto(
    Guid MonthExpenseItemId,
    string? Name,
    Guid? CategoryId,
    decimal? AmountMonthly,
    bool? IsActive,
    string? SubscriptionLifecycleStatus,
    bool UpdateDefault);
