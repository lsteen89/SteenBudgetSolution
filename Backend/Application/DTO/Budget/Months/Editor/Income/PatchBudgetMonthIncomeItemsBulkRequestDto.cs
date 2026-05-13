namespace Backend.Application.DTO.Budget.Months.Editor.Income;

public sealed record PatchBudgetMonthIncomeItemsBulkRequestDto(
    IReadOnlyList<PatchBudgetMonthIncomeItemBulkRowDto> Items);

