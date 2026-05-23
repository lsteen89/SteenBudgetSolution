using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Savings;

// Dapper-backed implementation of the per-month base-savings editor.
// Mirrors the goal mutation repo's structure (SqlBase helpers, .Sql.cs partial
// holding the SQL constants) so the two slices stay easy to compare.
public sealed partial class BudgetMonthBaseSavingsMutationRepository
    : SqlBase, IBudgetMonthBaseSavingsMutationRepository
{
    public BudgetMonthBaseSavingsMutationRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthBaseSavingsMutationRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthMutationMetaReadModel>(
            GetBudgetMonthMetaSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task<BudgetMonthBaseSavingsMutationReadModel?> GetBudgetMonthBaseSavingsForEditAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthBaseSavingsMutationReadModel>(
            GetBudgetMonthBaseSavingsForEditSql,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task UpdateMonthBaseSavingsAsync(
        UpdateBudgetMonthBaseSavingsModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateMonthBaseSavingsSql, model, ct);

    public Task UpdateBaselineBaseSavingsAsync(
        UpdateBaselineBaseSavingsModel model,
        CancellationToken ct)
        => ExecuteAsync(UpdateBaselineBaseSavingsSql, model, ct);
}
