using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class ExpenditureSqlExecutor : SqlBase, IExpenditureSqlExecutor
    {
        private readonly ICurrentUserContext _currentUser;

        public ExpenditureSqlExecutor(IUnitOfWork unitOfWork, ILogger<ExpenditureSqlExecutor> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger) 
        {
            _currentUser = currentUser;
        }

        private const string InsertSql = @"
            INSERT INTO ExpenseItem (Id, BudgetId, CategoryId, Name, AmountMonthly, CreatedByUserId)
            VALUES (@Id, @BudgetId, @CategoryId, @Name, @AmountMonthly, @CreatedByUserId);";


        public async Task InsertExpenseItemsAsync(Expense aggregate)
        {
            var itemsToInsert = aggregate.Items.ToList();
            var itemCount = itemsToInsert.Count;

            var createdByUserId = _currentUser.Persoid;
            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");



            _logger.LogInformation("Inserting {Count} expense items for budget {BudgetId}", itemCount, aggregate.BudgetId);

            // Prepare the items in the materialized list
            foreach (var item in itemsToInsert)
            {
                if (item.Id == Guid.Empty) item.Id = Guid.NewGuid();
                item.BudgetId = aggregate.BudgetId;
                item.CreatedByUserId = createdByUserId;
            }
            await ExecuteAsync(InsertSql, itemsToInsert);

            _logger.LogInformation("Inserted {Count} expense items totaling {Total} for budget {BudgetId}",
                itemCount,
                itemsToInsert.Sum(i => i.AmountMonthly),
                aggregate.BudgetId);
        }
    }
}
