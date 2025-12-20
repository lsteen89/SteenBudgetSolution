namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class ExpenseCategorySummaryDto
{
    public string CategoryName { get; init; } = string.Empty;
    public decimal TotalMonthlyAmount { get; init; }
}