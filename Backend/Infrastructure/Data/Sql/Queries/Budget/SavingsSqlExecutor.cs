using Backend.Domain.Entities.Budget.Savings;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public class SavingsSqlExecutor : SqlBase, ISavingsSqlExecutor
    {
        public SavingsSqlExecutor(IUnitOfWork unitOfWork, ILogger<SavingsSqlExecutor> logger)
            : base(unitOfWork, logger)
        {
        }

        public async Task AddSavingsAsync(Savings savings, Guid budgetId)
        {
            _logger.LogInformation("Inserting savings and children for budget {BudgetId}", budgetId);

            // --- ID MANAGEMENT ---
            if (savings.Id == Guid.Empty)
                savings.Id = Guid.NewGuid();

            // Prepare the children before the call.
            // Make sure every kid knows who their daddy is and has their own ID.
            foreach (var method in savings.SavingMethods)
            {
                if (method.Id == Guid.Empty) method.Id = Guid.NewGuid();
                method.SavingsId = savings.Id;
            }
            foreach (var goal in savings.SavingsGoals)
            {
                if (goal.Id == Guid.Empty) goal.Id = Guid.NewGuid();
                goal.SavingsId = savings.Id;
            }

            // --- THE CALLS ---
            // One trip for the parent.
            const string insertSavingsSql = @"
            INSERT INTO Savings (Id, BudgetId, MonthlySavings)
            VALUES (UUID_TO_BIN(@Id), UUID_TO_BIN(@BudgetId), @MonthlySavings);";
            await ExecuteAsync(insertSavingsSql, savings);

            // One trip for ALL the methods.
            if (savings.SavingMethods.Any())
            {
                const string insertMethodSql = @"
                INSERT INTO SavingsMethod (Id, SavingsId, Method)
                VALUES (UUID_TO_BIN(@Id), UUID_TO_BIN(@SavingsId), @Method);";
                // Dapper is smart enough to run this for every item in the list.
                await ExecuteAsync(insertMethodSql, savings.SavingMethods);
            }

            // One trip for ALL the goals.
            if (savings.SavingsGoals.Any())
            {
                const string insertGoalSql = @"
                INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved)
                VALUES (UUID_TO_BIN(@Id), UUID_TO_BIN(@SavingsId), @Name, @TargetAmount, @TargetDate, @AmountSaved);";
                // Same deal here. One call, many inserts.
                await ExecuteAsync(insertGoalSql, savings.SavingsGoals);
            }
        }
    }
}
