using Backend.Domain.Entities.Budget.Debt;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Abstractions;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget
{
    public class DebtsRepository : SqlBase, IDebtsRepository
    {
        private readonly ICurrentUserContext _currentUser;

        public DebtsRepository(
            IUnitOfWork unitOfWork,
            ILogger<DebtsRepository> logger,
            ICurrentUserContext currentUser,
            IOptions<DatabaseSettings> db)
            : base(unitOfWork, logger, db)
        {
            _currentUser = currentUser;
        }

        #region SQL Queries Insert
        private const string InsertNewDebtSql = @"
            INSERT INTO Debt (Id, BudgetId, Name, Type, Balance, Apr, MonthlyFee, MinPayment, TermMonths, CreatedByUserId)
            VALUES (@Id, @BudgetId, @Name, @Type, @Balance, @Apr, @MonthlyFee, @MinPayment, @TermMonths, @CreatedByUserId);";
        #endregion

        public async Task AddDebtsAsync(IEnumerable<Debt> debts, Guid budgetId, CancellationToken ct)
        {
            foreach (var d in debts)
            {
                // Ensure each expense ID is valid
                if (d.BudgetId == Guid.Empty)
                    d.BudgetId = budgetId;
            }

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
            await ExecuteAsync(InsertNewDebtSql, debtList, ct);
            _logger.LogInformation("Successfully inserted {Count} debts for BudgetId {BudgetId}.", debtCount, budgetId);
        }
    }
}

