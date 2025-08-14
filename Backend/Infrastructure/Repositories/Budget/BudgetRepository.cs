using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class BudgetRepository : SqlBase, IBudgetRepository
    {
        private readonly ICurrentUserContext _currentUser;

        public BudgetRepository(IUnitOfWork unitOfWork, ILogger<BudgetRepository> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger)
        {
            _currentUser = currentUser;
        }
        const string updateRepaymentSql = @"
            UPDATE BUDGET 
            SET DebtRepaymentStrategy = @STRAT, UpdatedByUserId = @currentUserId
            WHERE Id = (@BudgetId);";

        public async Task UpdateRepaymentStrategyAsync(string strat, Guid budgetId, CancellationToken ct)
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
            }, ct);

            _logger.LogInformation("Repayment strategy updated for budget {BudgetId}", budgetId);
        }
    }
}

