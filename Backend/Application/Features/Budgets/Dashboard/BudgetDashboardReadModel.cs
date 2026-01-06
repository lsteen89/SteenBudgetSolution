namespace Backend.Application.Features.Budgets.Dashboard;

public sealed record BudgetDashboardIncomeItem(
    Guid Id,
    string Name,
    decimal AmountMonthly);
