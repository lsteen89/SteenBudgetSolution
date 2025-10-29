using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class BudgetRepository : SqlBase, IBudgetRepository
    {
        private readonly ICurrentUserContext _currentUser;

        public BudgetRepository(IUnitOfWork unitOfWork, ILogger<BudgetRepository> logger, ICurrentUserContext currentUser, IOptions<DatabaseSettings> db)
            : base(unitOfWork, logger, db)
        {
            _currentUser = currentUser;
        }
        const string updateRepaymentSql = @"
            UPDATE BUDGET 
            SET DebtRepaymentStrategy = @STRAT, UpdatedByUserId = @currentUserId
            WHERE Id = (@BudgetId);";

        const string createBudget = @"
                INSERT INTO Budget (Id, Persoid, DebtRepaymentStrategy, CreatedAt, CreatedByUserId)
                VALUES (@BudgetId, @Persoid, @DebtRepaymentStrategy, UTC_TIMESTAMP(), @CreatedByUserId)";

        public async Task<bool> CreateBudgetAsync(Guid budgetId, Guid persoId, CancellationToken ct = default, string? debtRepaymentStrategy = null)
        {
            var parameters = new
            {
                BudgetId = budgetId,
                Persoid = persoId,
                DebtRepaymentStrategy = debtRepaymentStrategy,
                CreatedByUserId = persoId
            };

            int rowsAffected = await ExecuteAsync(createBudget, parameters, ct);

            return rowsAffected > 0;
        }

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

