using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public sealed class SavingsSqlExecutor : SqlBase, ISavingsSqlExecutor
    {
        private readonly ICurrentUserContext _currentUser;

        public SavingsSqlExecutor(IUnitOfWork unitOfWork, ILogger<SavingsSqlExecutor> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger)
        {
            _currentUser = currentUser;
        }
        #region SQL Queries Insert

        // These SQL queries are used to insert data into the Savings, SavingsMethod, and SavingsGoal tables.

        // Savings table stores the overall savings plan.
        const string insertSavingsSql = @"
            INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedByUserId)
            VALUES (@Id, @BudgetId, @MonthlySavings, @CreatedByUserId);";

        // SavingsMethod table stores the methods used to save money.
        const string insertMethodSql = @"
                INSERT INTO SavingsMethod (Id, SavingsId, Method, CreatedByUserId)
                VALUES (@Id, @SavingsId, @Method, @CreatedByUserId);";

        // SavingsGoal table stores specific savings goals.
        const string insertGoalSql = @"
                INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, CreatedByUserId)
                VALUES (@Id, @SavingsId, @Name, @TargetAmount, @TargetDate, @AmountSaved, @CreatedByUserId);";

        #endregion

        public async Task AddSavingsAsync(Savings savings, Guid budgetId)
        {
            var createdByUserId = _currentUser.Persoid;
            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            _logger.LogInformation("Inserting savings and children for budget {BudgetId}", budgetId);

            // --- ID MANAGEMENT ---
            if (savings.Id == Guid.Empty)
                savings.Id = Guid.NewGuid();
            savings.CreatedByUserId = createdByUserId;
            savings.BudgetId = budgetId;

            await ExecuteAsync(insertSavingsSql, savings);

            // --- 2. Prepare and Insert SavingsMethods ---
            if (savings.SavingMethods?.Count > 0)
            {
                foreach (var method in savings.SavingMethods)
                {
                    if (method.Id == Guid.Empty) method.Id = Guid.NewGuid();
                    method.SavingsId = savings.Id;
                    method.CreatedByUserId = createdByUserId;
                }
                await ExecuteAsync(insertMethodSql, savings.SavingMethods);
            }

            // --- 3. Prepare and Insert SavingsGoals ---
            if (savings.SavingsGoals?.Count > 0)
            {
                foreach (var goal in savings.SavingsGoals)
                {
                    if (goal.Id == Guid.Empty) goal.Id = Guid.NewGuid();
                    goal.SavingsId = savings.Id;
                    goal.CreatedByUserId = createdByUserId;
                }
                await ExecuteAsync(insertGoalSql, savings.SavingsGoals);
            }
        }
    }
}
