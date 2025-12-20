namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class BudgetDashboardDto
{
    public Guid BudgetId { get; init; }

    public IncomeOverviewDto Income { get; init; } = default!;
    public ExpenditureOverviewDto Expenditure { get; init; } = default!;
    public SavingsOverviewDto? Savings { get; init; }
    public DebtOverviewDto Debt { get; init; } = default!;
    public IReadOnlyList<DashboardRecurringExpenseDto> RecurringExpenses { get; init; }
        = Array.Empty<DashboardRecurringExpenseDto>();
    public decimal DisposableAfterExpenses =>
        Income.TotalIncomeMonthly - Expenditure.TotalExpensesMonthly;

    public decimal DisposableAfterExpensesAndSavings =>
        Income.TotalIncomeMonthly - Expenditure.TotalExpensesMonthly - (Savings?.MonthlySavings ?? 0m);
    public SubscriptionsOverviewDto Subscriptions { get; init; } = default!;
}
