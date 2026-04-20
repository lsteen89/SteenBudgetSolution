namespace Backend.Infrastructure.Repositories.Budget.BudgetDashboard;

internal sealed record DashboardTotalsRow(
    Guid? IncomeId,
    decimal NetSalaryMonthly,
    string IncomePaymentDayType,
    int? IncomePaymentDay,
    decimal SideHustleMonthly,
    decimal HouseholdMembersMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtBalance);

internal sealed record DashboardSavingsRow(
    decimal MonthlySavings,
    Guid? Id,
    string? Name,
    decimal? TargetAmount,
    DateTime? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution);

internal sealed record DashboardIncomeItemRow(
    Guid Id,
    string Name,
    decimal AmountMonthly);

internal sealed record DashboardMonthMetaRow(
    Guid BudgetMonthId,
    Guid BudgetId
);
