namespace Backend.Application.DTO.Budget.Months.Editor.Savings;

public sealed record PatchBudgetMonthSavingsGoalsBulkRequestDto(
    IReadOnlyList<PatchBudgetMonthSavingsGoalBulkRowDto> Items);
