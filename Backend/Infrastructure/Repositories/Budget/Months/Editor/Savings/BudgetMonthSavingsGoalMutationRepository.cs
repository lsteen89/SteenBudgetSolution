using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;

public sealed partial class BudgetMonthSavingsGoalMutationRepository
    : SqlBase, IBudgetMonthSavingsGoalMutationRepository
{
    public BudgetMonthSavingsGoalMutationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthSavingsGoalMutationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthMutationMetaReadModel>(
            GetBudgetMonthMeta,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthSavingsGoalEditorRowReadModel>> GetSavingsGoalEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthSavingsGoalEditorRowReadModel>(
            GetSavingsGoalEditorRows,
            new
            {
                BudgetMonthId = budgetMonthId,
                IncludeDeleted = includeDeleted
            },
            ct);

    public Task<BudgetMonthSavingsGoalMutationReadModel?> GetSavingsGoalForMutationAsync(
        Guid budgetMonthId,
        Guid monthSavingsGoalId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthSavingsGoalMutationReadModel>(
            GetSavingsGoalForMutation,
            new
            {
                BudgetMonthId = budgetMonthId,
                MonthSavingsGoalId = monthSavingsGoalId
            },
            ct);

    public Task UpdateMonthSavingsGoalContributionAsync(
        UpdateBudgetMonthSavingsGoalModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateMonthSavingsGoalContributionSql, model, ct);

    public async Task<bool> BaselineSavingsGoalExistsAsync(
        Guid savingsGoalId,
        CancellationToken ct)
        => await QuerySingleOrDefaultAsync<int?>(
            BaselineSavingsGoalExistsSql,
            new { SavingsGoalId = savingsGoalId },
            ct) == 1;

    public Task UpdateBaselineSavingsGoalContributionAsync(
        UpdateBaselineSavingsGoalModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateBaselineSavingsGoalContributionSql, model, ct);

    public Task UpdateMonthSavingsGoalTargetDateAsync(
        UpdateBudgetMonthSavingsGoalTargetDateModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateMonthSavingsGoalTargetDateSql, model, ct);

    public Task UpdateBaselineSavingsGoalTargetDateAsync(
        UpdateBaselineSavingsGoalTargetDateModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateBaselineSavingsGoalTargetDateSql, model, ct);

    public Task<int> UpdateOpenLinkedMonthSavingsGoalTargetDateAsync(
        UpdateOpenLinkedMonthSavingsGoalTargetDateModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateOpenLinkedMonthSavingsGoalTargetDateSql, model, ct);

    public Task<BudgetMonthSavingsForCreateReadModel?> GetBudgetMonthSavingsForCreateAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthSavingsForCreateReadModel>(
            GetBudgetMonthSavingsForCreateSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task InsertBaselineSavingsGoalAsync(
        InsertBaselineSavingsGoalModel model,
        CancellationToken ct)
        => ExecuteAsync(InsertBaselineSavingsGoalSql, model, ct);

    public Task InsertMonthSavingsGoalAsync(
        InsertBudgetMonthSavingsGoalModel model,
        CancellationToken ct)
        => ExecuteAsync(InsertMonthSavingsGoalSql, model, ct);
}
