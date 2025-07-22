using Backend.Domain.Entities.Budget.Savings;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public class SavingsSqlExecutor : SqlBase, ISavingsSqlExecutor
    {
        public SavingsSqlExecutor(IUnitOfWork unitOfWork, ILogger<SavingsSqlExecutor> logger)
            : base(unitOfWork, logger)
        {
        }
        #region SQL Queries Insert

        // These SQL queries are used to insert data into the Savings, SavingsMethod, and SavingsGoal tables.

        // Savings table stores the overall savings plan.
        const string insertSavingsSql = @"
            INSERT INTO Savings (Id, BudgetId, MonthlySavings)
            VALUES (BINARY(16)_TO_BIN(@Id), BINARY(16)_TO_BIN(@BudgetId), @MonthlySavings);";

        // SavingsMethod table stores the methods used to save money.
        const string insertMethodSql = @"
                INSERT INTO SavingsMethod (Id, SavingsId, Method)
                VALUES (BINARY(16)_TO_BIN(@Id), BINARY(16)_TO_BIN(@SavingsId), @Method);";

        // SavingsGoal table stores specific savings goals.
        const string insertGoalSql = @"
                INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved)
                VALUES (BINARY(16)_TO_BIN(@Id), BINARY(16)_TO_BIN(@SavingsId), @Name, @TargetAmount, @TargetDate, @AmountSaved);";

        #endregion

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

            // Insert the main savings record.
            await ExecuteAsync(insertSavingsSql, savings);

            // One trip for ALL the methods.
            if (savings.SavingMethods.Any())
            {

                // Dapper is smart enough to run this for every item in the list.
                await ExecuteAsync(insertMethodSql, savings.SavingMethods);
            }

            // One trip for ALL the goals.
            if (savings.SavingsGoals.Any())
            {

                // Same deal here. One call, many inserts.
                await ExecuteAsync(insertGoalSql, savings.SavingsGoals);
            }
        }
    }
}
