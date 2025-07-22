using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Infrastructure.Data.Sql.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget_Queries;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class BudgetSqlExecutor : SqlBase, IBudgetSqlExecutor
    {

        public BudgetSqlExecutor(IUnitOfWork unitOfWork, ILogger<BudgetSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        const string updateRepymentSql = @"
            UPDATE BUDGET SET DebtRepaymentStrategy = (@STRAT)
            WHERE BudgetId = BINARY(16)_TO_BIN(@BudgetId);";

        public async Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId)
        {
            _logger.LogInformation("Updating repayment strategy for budget {BudgetId}", budgetId);

            // Update the repayment strategy in the main budget table
            await ExecuteAsync(updateRepymentSql);

            _logger.LogInformation("Repayment strategy updated for budget {BudgetId}", budgetId);
        }
    }
}
