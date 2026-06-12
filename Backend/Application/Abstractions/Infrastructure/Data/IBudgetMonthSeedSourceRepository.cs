using Backend.Application.Features.Budgets.Months.Models.Baseline;
using Backend.Domain.Entities.Budget.Debt;
namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthSeedSourceRepository
{
    Task<BaselineIncomeSeedRm?> GetIncomeAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BaselineSideHustleSeedRm>> GetActiveSideHustlesAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BaselineHouseholdMemberSeedRm>> GetActiveHouseholdMembersAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BaselineExpenseItemSeedRm>> GetActiveExpenseItemsAsync(Guid budgetId, CancellationToken ct);

    Task<BaselineSavingsSeedRm?> GetSavingsAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BaselineSavingsGoalSeedRm>> GetActiveSavingsGoalsAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BaselineDebtSeedRm>> GetActiveDebtsAsync(Guid budgetId, CancellationToken ct);

    // The repayment strategy lives on the Budget row (not materialised into
    // months), so the dashboard reads it from there at projection time. The
    // next-month preview reads the same source to keep its debt overview
    // consistent with the live dashboard.
    Task<RepaymentStrategy> GetRepaymentStrategyAsync(Guid budgetId, CancellationToken ct);
}