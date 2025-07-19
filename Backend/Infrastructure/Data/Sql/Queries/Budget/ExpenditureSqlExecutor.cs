using Backend.Domain.Entities.Budget.Expenses;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class ExpenditureSqlExecutor : SqlBase, IExpenditureSqlExecutor
    {
        private readonly ILogger<ExpenditureSqlExecutor> _logger;

        public ExpenditureSqlExecutor(IUnitOfWork unitOfWork, ILogger<ExpenditureSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        private const string InsertSql = @"
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly)
            VALUES (UUID_TO_BIN(@Id), UUID_TO_BIN(@BudgetId), UUID_TO_BIN(@CategoryId), @Name, @AmountMonthly);";


        public async Task InsertExpenseItemsAsync(Expense aggregate)
        {
            _logger.LogInformation("Inserting {Count} expense items for budget {BudgetId}",
                aggregate.Items.Count, aggregate.BudgetId);

            foreach (var item in aggregate.Items)
            {
                if (item.Id == Guid.Empty) item.Id = Guid.NewGuid();
                item.BudgetId = aggregate.BudgetId;

                await ExecuteAsync(InsertSql, new
                {
                    Id = item.Id,
                    BudgetId = item.BudgetId,
                    CategoryId = item.CategoryId,
                    item.Name,
                    item.AmountMonthly
                });
            }
            _logger.LogInformation("Inserted {Count} expense items totaling {Total} for budget {BudgetId}",
                aggregate.Items.Count,
                aggregate.Items.Sum(i => i.AmountMonthly),
                aggregate.BudgetId);
        }
    }
}
