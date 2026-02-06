namespace Backend.Application.Abstractions.Application.Services.Budget;

public interface IBudgetMonthlyTotalsService
{
    Task<MonthlyTotalsResult?> ComputeAsync(Guid persoid, CancellationToken ct);
}

public sealed record MonthlyTotalsResult(
    Guid BudgetId,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal TotalSavings,
    decimal TotalDebtPayments
);
