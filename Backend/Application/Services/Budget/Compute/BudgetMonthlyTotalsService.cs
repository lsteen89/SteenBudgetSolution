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

        var habit = data.Savings?.MonthlySavings ?? 0m;
        var goal = data.Savings?.Goals.Sum(g => g.MonthlyContribution) ?? 0m;
        var totalSavings = habit + goal;

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