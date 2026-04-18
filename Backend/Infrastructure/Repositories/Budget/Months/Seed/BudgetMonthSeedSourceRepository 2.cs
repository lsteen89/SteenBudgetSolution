using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Models.Baseline;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget.Months.Seed;

public sealed partial class BudgetMonthSeedSourceRepository : SqlBase, IBudgetMonthSeedSourceRepository
{
    public BudgetMonthSeedSourceRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthSeedSourceRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public async Task<BaselineIncomeSeedRm?> GetIncomeAsync(Guid budgetId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<BaselineIncomeSeedRm>(
            GetIncomeSql,
            new { BudgetId = budgetId },
            ct);

    public async Task<IReadOnlyList<BaselineSideHustleSeedRm>> GetActiveSideHustlesAsync(Guid budgetId, CancellationToken ct)
        => (await QueryAsync<BaselineSideHustleSeedRm>(
            GetActiveSideHustlesSql,
            new { BudgetId = budgetId },
            ct)).ToList();

    public async Task<IReadOnlyList<BaselineHouseholdMemberSeedRm>> GetActiveHouseholdMembersAsync(Guid budgetId, CancellationToken ct)
        => (await QueryAsync<BaselineHouseholdMemberSeedRm>(
            GetActiveHouseholdMembersSql,
            new { BudgetId = budgetId },
            ct)).ToList();

    public async Task<IReadOnlyList<BaselineExpenseItemSeedRm>> GetActiveExpenseItemsAsync(Guid budgetId, CancellationToken ct)
        => (await QueryAsync<BaselineExpenseItemSeedRm>(
            GetActiveExpenseItemsSql,
            new { BudgetId = budgetId },
            ct)).ToList();

    public async Task<BaselineSavingsSeedRm?> GetSavingsAsync(Guid budgetId, CancellationToken ct)
        => await QuerySingleOrDefaultAsync<BaselineSavingsSeedRm>(
            GetSavingsSql,
            new { BudgetId = budgetId },
            ct);

    public async Task<IReadOnlyList<BaselineSavingsGoalSeedRm>> GetActiveSavingsGoalsAsync(Guid budgetId, CancellationToken ct)
        => (await QueryAsync<BaselineSavingsGoalSeedRm>(
            GetActiveSavingsGoalsSql,
            new { BudgetId = budgetId },
            ct)).ToList();

    public async Task<IReadOnlyList<BaselineDebtSeedRm>> GetActiveDebtsAsync(Guid budgetId, CancellationToken ct)
        => (await QueryAsync<BaselineDebtSeedRm>(
            GetActiveDebtsSql,
            new { BudgetId = budgetId },
            ct)).ToList();
}