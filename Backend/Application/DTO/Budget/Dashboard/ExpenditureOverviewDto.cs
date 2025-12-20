namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class ExpenditureOverviewDto
{
    public decimal TotalExpensesMonthly { get; init; }
    public IReadOnlyList<ExpenseCategorySummaryDto> ByCategory { get; init; } =
        Array.Empty<ExpenseCategorySummaryDto>();
}
