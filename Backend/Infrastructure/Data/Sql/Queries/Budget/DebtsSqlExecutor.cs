using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQuries;
using Backend.Infrastructure.Data.Sql.Queries.Budget;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class DebtsSqlExecutor : SqlBase, IDebtsSqlExecutor
    {

        private readonly ICurrentUserContext _currentUser;

        public DebtsSqlExecutor(
            IUnitOfWork unitOfWork,
            ILogger<DebtsSqlExecutor> logger,
            ICurrentUserContext currentUser)
            : base(unitOfWork, logger) 
        {
            _currentUser = currentUser;
        }
        #region SQL Queries Insert
        private const string InsertNewDebtSql = @"
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedByUserId)
            VALUES (BINARY(16)_TO_BIN(@Id), BINARY(16)_TO_BIN(@BudgetId), @Name, @Type, @Balance, @Apr, @MonthlyFee, @MinPayment, @TermMonths, @CreatedByUserId);";
        #endregion
        public async Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId)
        {
            var CreatedByUserId = _currentUser.Persoid;

            if (CreatedByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            var ID = Guid.NewGuid();

            // Prepare the debts for insertion
            foreach (var debt in debts)
            {
                debt.Id = Guid.NewGuid();
                debt.BudgetId = budgetId;
                debt.CreatedByUserId = CreatedByUserId;
            }
            _logger.LogInformation("Inserting debts for BudgetId {BudgetId}.", budgetId);
            // Execute the insert command for each debt
            await ExecuteAsync(InsertNewDebtSql, debts);
            _logger.LogInformation("Inserted {Count} debts for BudgetId {BudgetId}.", debts.Count(), budgetId);
        }
    }
}

