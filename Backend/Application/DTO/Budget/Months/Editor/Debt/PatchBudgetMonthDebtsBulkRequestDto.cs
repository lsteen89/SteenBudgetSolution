namespace Backend.Application.DTO.Budget.Months.Editor.Debt;

public sealed record PatchBudgetMonthDebtsBulkRequestDto(
    IReadOnlyList<PatchBudgetMonthDebtBulkRowDto> Items);
