namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

public sealed partial class BudgetDashboardRepository
{
    private sealed record TotalsRow(
        decimal NetSalaryMonthly,
        decimal SideHustleMonthly,
        decimal HouseholdMembersMonthly,
        decimal TotalExpensesMonthly,
        decimal TotalSavingsMonthly,
        decimal TotalDebtBalance);

    private sealed record SavingsRow(
        decimal MonthlySavings,
        Guid? Id,
        string? Name,
        decimal? TargetAmount,
        DateTime? TargetDate,
        decimal? AmountSaved);
    private sealed record RecurringExpenseRow(
        Guid Id,
        string Name,
        string CategoryName,
        decimal AmountMonthly);

    private sealed record SubscriptionRow(
        Guid Id,
        string Name,
        decimal AmountMonthly);
}