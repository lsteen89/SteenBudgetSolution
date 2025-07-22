using Backend.Domain.Entities.Budget.Expenses;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class ExpenditureSqlExecutor : SqlBase, IExpenditureSqlExecutor
    {
        public ExpenditureSqlExecutor(IUnitOfWork unitOfWork, ILogger<ExpenditureSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        private const string InsertSql = @"
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly)
            VALUES (BINARY(16)_TO_BIN(@Id), BINARY(16)_TO_BIN(@BudgetId), BINARY(16)_TO_BIN(@CategoryId), @Name, @AmountMonthly);";


        public async Task InsertExpenseItemsAsync(Expense aggregate)
        {
            _logger.LogInformation("Inserting {Count} expense items for budget {BudgetId}",
                aggregate.Items.Count, aggregate.BudgetId);

            // Prepare the items before the call.
            foreach (var item in aggregate.Items)
            {
                if (item.Id == Guid.Empty) item.Id = Guid.NewGuid();
                item.BudgetId = aggregate.BudgetId;
            }
            await ExecuteAsync(InsertSql, aggregate.Items);

            _logger.LogInformation("Inserted {Count} expense items totaling {Total} for budget {BudgetId}",
                aggregate.Items.Count,
                aggregate.Items.Sum(i => i.AmountMonthly),
                aggregate.BudgetId);
        }
    }
}
