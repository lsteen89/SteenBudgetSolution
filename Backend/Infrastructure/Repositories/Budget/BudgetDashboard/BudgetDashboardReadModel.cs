using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Application.Features.Budgets.Dashboard;

public sealed record BudgetDashboardTotals(
    decimal NetSalaryMonthly,
    decimal SideHustleMonthly,
    decimal HouseholdMembersMonthly,
    decimal TotalExpensesMonthly,
    decimal TotalSavingsMonthly,
    decimal TotalDebtBalance);

public sealed record BudgetDashboardReadModel(
    Guid BudgetId,
    BudgetDashboardTotals Totals,
    IReadOnlyList<ExpenseCategorySummaryDto> Categories,
    IReadOnlyList<DashboardRecurringExpenseDto> RecurringExpenses,
    IReadOnlyList<Debt> Debts,
    SavingsOverviewDto? Savings,
    SubscriptionsOverviewDto Subscriptions);
