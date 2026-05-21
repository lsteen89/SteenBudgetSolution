using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.Application.Services.Budget.Compute;

public sealed class BudgetMonthlyTotalsService : IBudgetMonthlyTotalsService
{
    private readonly IBudgetMonthDashboardRepository _repo;

    public BudgetMonthlyTotalsService(IBudgetMonthDashboardRepository repo)
    {
        _repo = repo;
    }

    public async Task<MonthlyTotalsResult?> ComputeAsync(Guid budgetMonthId, CancellationToken ct)
    {
        var data = await _repo.GetDashboardDataForMonthAsync(budgetMonthId, ct);
        if (data is null) return null;

        var totalIncome =
            data.Totals.NetSalaryMonthly +
            data.Totals.SideHustleMonthly +
            data.Totals.HouseholdMembersMonthly;

        var totalExpenses = data.Totals.TotalExpensesMonthly;

        var totalSavings = data.Savings?.MonthlySavings ?? 0m;

        var totalDebtPayments = data.Debt.Debts.Sum(d => d.MonthlyPayment);

        return new MonthlyTotalsResult(
            BudgetMonthId: budgetMonthId,
            BudgetId: data.BudgetId,
            TotalIncome: totalIncome,
            TotalExpenses: totalExpenses,
            TotalSavings: totalSavings,
            TotalDebtPayments: totalDebtPayments
        );
    }
}
