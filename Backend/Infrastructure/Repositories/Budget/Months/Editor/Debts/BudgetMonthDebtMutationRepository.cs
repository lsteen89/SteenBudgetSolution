using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;

public sealed partial class BudgetMonthDebtMutationRepository
    : SqlBase, IBudgetMonthDebtMutationRepository
{
    public BudgetMonthDebtMutationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthDebtMutationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthMutationMetaReadModel>(
            GetBudgetMonthMeta,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthDebtEditorRowReadModel>> GetDebtEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthDebtEditorRowReadModel>(
            GetDebtEditorRows,
            new
            {
                BudgetMonthId = budgetMonthId,
                IncludeDeleted = includeDeleted
            },
            ct);

    public Task<BudgetMonthDebtMutationReadModel?> GetDebtForMutationAsync(
        Guid budgetMonthId,
        Guid monthDebtId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthDebtMutationReadModel>(
            GetDebtForMutation,
            new
            {
                BudgetMonthId = budgetMonthId,
                MonthDebtId = monthDebtId
            },
            ct);

    public Task UpdateMonthDebtMonthlyPaymentAsync(
        UpdateBudgetMonthDebtModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateMonthDebtMonthlyPaymentSql, model, ct);

    public async Task<bool> BaselineDebtExistsAsync(
        Guid debtId,
        CancellationToken ct)
        => await QuerySingleOrDefaultAsync<int?>(
            BaselineDebtExistsSql,
            new { DebtId = debtId },
            ct) == 1;

    public Task<decimal?> GetBaselineDebtMonthlyPaymentAsync(
        Guid debtId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<decimal?>(
            GetBaselineDebtMonthlyPaymentSql,
            new { DebtId = debtId },
            ct);

    public Task UpdateBaselineDebtMonthlyPaymentAsync(
        UpdateBaselineDebtModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateBaselineDebtMonthlyPaymentSql, model, ct);

    // --- Debt PR 2: create + edit-metadata surface -----------------------

    public Task<BudgetMonthDebtForCreateReadModel?> GetBudgetMonthForDebtCreateAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthDebtForCreateReadModel>(
            GetBudgetMonthForDebtCreateSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task InsertBaselineDebtAsync(
        InsertBaselineDebtModel model,
        CancellationToken ct)
        => ExecuteAsync(InsertBaselineDebtSql, model, ct);

    public Task InsertMonthDebtAsync(
        InsertBudgetMonthDebtModel model,
        CancellationToken ct)
        => ExecuteAsync(InsertMonthDebtSql, model, ct);

    public Task<BudgetMonthDebtBaselineSnapshotReadModel?> GetBaselineDebtSnapshotAsync(
        Guid debtId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthDebtBaselineSnapshotReadModel>(
            GetBaselineDebtSnapshotSql,
            new { DebtId = debtId },
            ct);

    public Task UpdateMonthDebtDetailsAsync(
        UpdateBudgetMonthDebtDetailsModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateMonthDebtDetailsSql, model, ct);

    public Task UpdateBaselineDebtDetailsAsync(
        UpdateBaselineDebtDetailsModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateBaselineDebtDetailsSql, model, ct);
}
