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
    // MariaDB returns `(s.SourceSavingsId IS NULL)` as Int32 (0/1). Dapper's
    // positional record materialization refuses to convert Int32 -> bool on a
    // constructor parameter, so we materialize the raw int and let callers
    // coerce. `!= 0` semantics: NULL => 1 => true (orphan / month-only).
    int IsMonthOnly,
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
