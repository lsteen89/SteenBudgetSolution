namespace Backend.Application.DTO.Budget.Dashboard;

public sealed class IncomeOverviewDto
{
    public decimal NetSalaryMonthly { get; init; }
    public decimal SideHustleMonthly { get; init; }
    public decimal TotalIncomeMonthly => NetSalaryMonthly + SideHustleMonthly;
}

public sealed class ExpenseCategorySummaryDto
{
    public string CategoryName { get; init; } = string.Empty;
    public decimal TotalMonthlyAmount { get; init; }
}

public sealed class ExpenditureOverviewDto
{
    public decimal TotalExpensesMonthly { get; init; }
    public IReadOnlyList<ExpenseCategorySummaryDto> ByCategory { get; init; } =
        Array.Empty<ExpenseCategorySummaryDto>();
}

public sealed class DashboardDebtItemDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal Apr { get; init; }
}

public sealed class DebtOverviewDto
{
    public decimal TotalDebtBalance { get; init; }
    public IReadOnlyList<DashboardDebtItemDto> Debts { get; init; } =
        Array.Empty<DashboardDebtItemDto>();
}

public sealed class DashboardSavingsGoalDto
{
    public Guid Id { get; init; }
    public string? Name { get; init; }
    public decimal? TargetAmount { get; init; }
    public DateTime? TargetDate { get; init; }
    public decimal? AmountSaved { get; init; }
}

public sealed class SavingsOverviewDto
{
    public decimal MonthlySavings { get; init; }
    public IReadOnlyList<DashboardSavingsGoalDto> Goals { get; init; } =
        Array.Empty<DashboardSavingsGoalDto>();
}

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
}
