using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Abstractions;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Budget.Core
{
    public class SavingsRepository : SqlBase, ISavingsRepository
    {
        private readonly ICurrentUserContext _currentUser;

        public SavingsRepository(IUnitOfWork unitOfWork, ILogger<SavingsRepository> logger, ICurrentUserContext currentUser, IOptions<DatabaseSettings> db)
            : base(unitOfWork, logger, db)
        {
            _currentUser = currentUser;
        }

        #region SQL Queries Insert
        const string insertSavingsSql = @"
            INSERT INTO Savings (Id, BudgetId, MonthlySavings, CreatedByUserId)
            VALUES (@Id, @BudgetId, @MonthlySavings, @CreatedByUserId);";

        // SavingsGoal table stores specific savings goals.
        const string insertGoalSql = @"
                INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved, MonthlyContribution, CreatedByUserId)
                VALUES (@Id, @SavingsId, @Name, @TargetAmount, @TargetDate, @AmountSaved, @MonthlyContribution, @CreatedByUserId);";

        #endregion

        // Wizard finalize path. Plan-level `SavingsMethod` rows are intentionally
        // NOT written here — those represent storage vehicles
        // (savings_account/isk/funds/cash/custom) and are owned by the savings
        // editor, not the wizard's habit-style answers. See SavingsMapping.
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

            // --- Insert SavingsGoals ---
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
