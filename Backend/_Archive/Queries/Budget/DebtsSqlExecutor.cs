using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.BudgetQueries;

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
            VALUES (@Id, @BudgetId, @Name, @Type, @Balance, @Apr, @MonthlyFee, @MinPayment, @TermMonths, @CreatedByUserId);";
        #endregion
        public async Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId)
        {
            var debtList = debts.ToList();
            var debtCount = debtList.Count;

            var createdByUserId = _currentUser.Persoid;

            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            // Prepare the debts for insertion
            foreach (var debt in debtList)
            {
                debt.Id = Guid.NewGuid();
                debt.BudgetId = budgetId;
                debt.CreatedByUserId = createdByUserId;
            }
            _logger.LogInformation("Inserting debts for BudgetId {BudgetId}.", budgetId);
            // Execute the insert command for each debt
            await ExecuteAsync(InsertNewDebtSql, debtList);
            _logger.LogInformation("Successfully inserted {Count} debts for BudgetId {BudgetId}.", debtCount, budgetId);
        }
    }
}

