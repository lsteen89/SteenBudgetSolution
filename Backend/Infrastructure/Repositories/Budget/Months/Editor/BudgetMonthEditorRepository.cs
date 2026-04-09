using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Expense;
using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor;

public sealed partial class BudgetMonthEditorRepository : SqlBase, IBudgetMonthEditorRepository
{
    public BudgetMonthEditorRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthEditorRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<BudgetMonthEditorMetaReadModel?> GetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthEditorMetaReadModel>(
            GetMonthMeta,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthExpenseItemEditorRowReadModel>> GetExpenseItemEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct)
    {
        var rows = await QueryAsync<BudgetMonthExpenseItemEditorRowReadModel>(
            GetExpenseItemEditorRows,
            new
            {
                BudgetMonthId = budgetMonthId,
                IncludeDeleted = includeDeleted
            },
            ct);

        return rows;
    }
}