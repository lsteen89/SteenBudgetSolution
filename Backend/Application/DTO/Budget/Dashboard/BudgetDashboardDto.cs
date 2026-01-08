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

    public decimal CarryOverAmountMonthly { get; init; } // 0 for none, real value for open/full/custom 
    public decimal DisposableAfterExpensesWithCarryMonthly { get; init; }
    public decimal DisposableAfterExpensesAndSavingsWithCarryMonthly { get; init; }

    public decimal FinalBalanceWithCarryMonthly { get; init; }
}
public sealed record BudgetMonthMetaDto(
    string YearMonth,
    string Status,
    string CarryOverMode,
    decimal? CarryOverAmount
);

public sealed record BudgetMonthSnapshotTotalsDto(
    decimal TotalIncomeMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtPaymentsMonthly,
    decimal FinalBalanceMonthly
);

public sealed record BudgetDashboardMonthDto(
    BudgetMonthMetaDto Month,
    BudgetDashboardDto? LiveDashboard,                 // present when open
    BudgetMonthSnapshotTotalsDto? SnapshotTotals       // present when closed
);


