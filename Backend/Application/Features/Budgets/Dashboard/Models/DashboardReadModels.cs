using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Features.Budgets.Dashboard;

// All shapes returned by the repository for the Dashboard feature.

public sealed record DashboardTotalsRm(
    Guid? IncomeId,
    decimal NetSalaryMonthly,
    decimal SideHustleMonthly,
    decimal HouseholdMembersMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtBalance
);

public sealed record DashboardCategoryRm(
    Guid CategoryId,
    string CategoryName,
    decimal TotalMonthlyAmount
);

public sealed record DashboardRecurringExpenseRm(
    Guid Id,
    string Name,
    Guid CategoryId,
    string CategoryName,
    decimal AmountMonthly
);

public sealed record DashboardDebtRm(
    Guid Id,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths
);

public sealed record DashboardSavingsGoalRm(
    Guid Id,
    string? Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution // Todo: Implement this field 
);

public sealed record DashboardSavingsRm(
    decimal MonthlySavings,
    IReadOnlyList<DashboardSavingsGoalRm> Goals
);

public sealed record DashboardSubscriptionRm(
    Guid Id,
    string Name,
    decimal AmountMonthly
);

public sealed record DashboardSubscriptionsRm(
    decimal TotalMonthlyAmount,
    int Count,
    IReadOnlyList<DashboardSubscriptionRm> Items
);

public sealed record DashboardIncomeItemRm(
    Guid Id,
    string Name,
    decimal AmountMonthly
);

public sealed record DashboardDebtOverviewRm(
    decimal TotalDebtBalance,
    decimal TotalMonthlyPayments,
    RepaymentStrategy RepaymentStrategy,
    IReadOnlyList<DashboardDebtRm> Debts
);


public sealed record BudgetDashboardReadModel(
    Guid BudgetId,
    DashboardTotalsRm Totals,
    IReadOnlyList<DashboardCategoryRm> Categories,
    IReadOnlyList<DashboardRecurringExpenseRm> RecurringExpenses,
    DashboardDebtOverviewRm Debt,
    DashboardSavingsRm? Savings,
    DashboardSubscriptionsRm Subscriptions,
    IReadOnlyList<DashboardIncomeItemRm> SideHustles,
    IReadOnlyList<DashboardIncomeItemRm> HouseholdMembers
);
