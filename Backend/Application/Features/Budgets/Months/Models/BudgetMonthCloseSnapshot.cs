namespace Backend.Application.Features.Budgets.Months.Models;

public sealed record BudgetMonthCloseSnapshot(
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal TotalSavings,
    decimal TotalDebtPayments,
    decimal FinalBalance
);