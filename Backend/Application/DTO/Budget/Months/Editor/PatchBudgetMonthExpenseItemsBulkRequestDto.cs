namespace Backend.Application.DTO.Budget.Months.Editor;

/// <summary>
/// Transactional bulk patch of budget month expense items for a single month.
/// All rows are validated together; if any row fails, the entire request is rejected
/// and rolled back. See <see cref="PatchBudgetMonthExpenseItemBulkRowDto"/>.
/// </summary>
public sealed record PatchBudgetMonthExpenseItemsBulkRequestDto(
    IReadOnlyList<PatchBudgetMonthExpenseItemBulkRowDto> Items);
