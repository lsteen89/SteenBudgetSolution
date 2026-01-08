using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.Application.Services.Budget;

public sealed class BudgetMonthlyTotalsService : IBudgetMonthlyTotalsService
{
    private readonly IBudgetDashboardRepository _repo;
    private readonly IDebtPaymentCalculator _calc;

    public BudgetMonthlyTotalsService(IBudgetDashboardRepository repo, IDebtPaymentCalculator calc)
    {
        _repo = repo;
        _calc = calc;
    }

    public async Task<MonthlyTotalsResult?> ComputeAsync(Guid persoid, CancellationToken ct)
    {
        var data = await _repo.GetDashboardDataAsync(persoid, ct);
        if (data is null) return null;

        var totalIncome =
            data.Totals.NetSalaryMonthly +
            data.Totals.SideHustleMonthly +
            data.Totals.HouseholdMembersMonthly;

        var totalExpenses = data.Totals.TotalExpensesMonthly;

        var totalSavings = data.Savings?.MonthlySavings ?? 0m;

        var totalDebtPayments = data.Debts.Sum(d =>
            _calc.CalculateMonthlyPayment(
                new DebtForCalc(d.Type, d.Balance, d.Apr, d.MinPayment, d.MonthlyFee, d.TermMonths)
            )
        );

        return new MonthlyTotalsResult(
            BudgetId: data.BudgetId,
            TotalIncome: totalIncome,
            TotalExpenses: totalExpenses,
            TotalSavings: totalSavings,
            TotalDebtPayments: totalDebtPayments
        );
    }
}
