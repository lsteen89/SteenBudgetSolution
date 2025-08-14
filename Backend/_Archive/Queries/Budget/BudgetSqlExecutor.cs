using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQueries;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class BudgetSqlExecutor : SqlBase, IBudgetSqlExecutor
    {
        private readonly ICurrentUserContext _currentUser;


        public BudgetSqlExecutor(IUnitOfWork unitOfWork, ILogger<BudgetSqlExecutor> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger) 
        { 
            _currentUser = currentUser;
        }

        const string updateRepaymentSql = @"
            UPDATE BUDGET 
            SET DebtRepaymentStrategy = @STRAT, UpdatedByUserId = @currentUserId
            WHERE Id = (@BudgetId);";

        public async Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId)
        {
            var currentUserId = _currentUser.Persoid;

            if (currentUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            _logger.LogInformation("Updating repayment strategy for budget {BudgetId}", budgetId);

            // FIX: Pass the parameters to Dapper in an anonymous object.
            // The property names (STRAT, BudgetId) must match the @-parameters in the SQL.
            await ExecuteAsync(updateRepaymentSql, new
            {
                STRAT = strat,
                BudgetId = budgetId,
                currentUserId = currentUserId 
            });

            _logger.LogInformation("Repayment strategy updated for budget {BudgetId}", budgetId);
        }
    }
}
