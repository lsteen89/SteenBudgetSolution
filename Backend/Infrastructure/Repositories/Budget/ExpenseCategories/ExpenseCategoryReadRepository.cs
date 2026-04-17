using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories.Models;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.ExpenseCategories;

public sealed partial class ExpenseCategoryReadRepository : SqlBase, IExpenseCategoryReadRepository
{
    public ExpenseCategoryReadRepository(
        IUnitOfWork unitOfWork,
        ILogger<ExpenseCategoryReadRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public async Task<IReadOnlyList<ExpenseCategoryReadModel>> GetExpenseCategoriesAsync(CancellationToken ct)
    {
        var rows = await QueryAsync<ExpenseCategoryReadModel>(
            GetExpenseCategories,
            ct: ct);

        return rows;
    }
}
