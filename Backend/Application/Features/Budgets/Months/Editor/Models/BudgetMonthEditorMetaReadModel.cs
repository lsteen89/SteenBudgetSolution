namespace Backend.Application.Features.Budgets.Months.Editor.Models;

public sealed record BudgetMonthEditorMetaReadModel(
    Guid BudgetMonthId,
    string YearMonth,
    string Status,
    decimal? CarryOverAmount,
    string CarryOverMode);