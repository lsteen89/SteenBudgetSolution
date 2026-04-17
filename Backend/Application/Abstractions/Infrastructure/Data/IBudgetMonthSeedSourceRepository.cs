using Backend.Application.Features.Budgets.Months.Models.Baseline;
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
}