using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Abstractions;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;


namespace Backend.Infrastructure.Repositories.Budget
{
    public class SavingsRepository : SqlBase, ISavingsRepository
    {
        private readonly ICurrentUserContext _currentUser;

        public SavingsRepository(IUnitOfWork unitOfWork, ILogger<SavingsRepository> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger)
        {
            _currentUser = currentUser;
        }

        #region SQL Queries Insert
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

        public async Task AddAsync(Savings savings, Guid budgetId, CancellationToken ct)
        {
            if (savings.BudgetId != budgetId)
                savings.BudgetId = budgetId;

            var createdByUserId = _currentUser.Persoid;
            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            _logger.LogInformation("Inserting savings and children for budget {BudgetId}", budgetId);

            // --- ID MANAGEMENT ---
            if (savings.Id == Guid.Empty)
                savings.Id = Guid.NewGuid();
            savings.CreatedByUserId = createdByUserId;
            savings.BudgetId = budgetId;

            await ExecuteAsync(insertSavingsSql, savings, ct);

            // --- 2. Prepare and Insert SavingsMethods ---
            if (savings.SavingMethods?.Count > 0)
            {
                foreach (var method in savings.SavingMethods)
                {
                    if (method.Id == Guid.Empty) method.Id = Guid.NewGuid();
                    method.SavingsId = savings.Id;
                    method.CreatedByUserId = createdByUserId;
                }
                await ExecuteAsync(insertMethodSql, savings.SavingMethods, ct);
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
                await ExecuteAsync(insertGoalSql, savings.SavingsGoals, ct);
            }
        }
    }
}
