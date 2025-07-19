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
            _logger.LogInformation("Inserting savings for budget {BudgetId}", savings.BudgetId);

            // Guard: ensure ID once; don't override upstream deterministic ID
            if (savings.Id == Guid.Empty)
                savings.Id = Guid.NewGuid();

            // ------------------------------------------------------------------
            // Parent row
            // ------------------------------------------------------------------
            const string insertSavingsSql = @"
            INSERT INTO Savings (Id, BudgetId, SavingHabit, MonthlySavings)
            VALUES (@Id, @BudgetId, @SavingHabit, @MonthlySavings);";

            await ExecuteAsync(insertSavingsSql, new
            {
                savings.Id,
                savings.BudgetId,
                savings.SavingHabit,
                savings.MonthlySavings
            });

            // ------------------------------------------------------------------
            // Methods (list of strings)
            // ------------------------------------------------------------------
            if (savings.SavingMethods is { Count: > 0 })
            {
                const string insertMethodSql = @"
                INSERT INTO SavingsMethod (SavingsId, Method)
                VALUES (@SavingsId, @Method);";

                foreach (var raw in savings.SavingMethods)
                {
                    // Basic hygiene: trim, skip null/empty
                    var method = raw?.Trim();
                    if (string.IsNullOrWhiteSpace(method)) continue;

                    await ExecuteAsync(insertMethodSql, new
                    {
                        SavingsId = savings.Id,
                        Method = method
                    });
                }
            }

            // ------------------------------------------------------------------
            // Goals (child entities)
            // ------------------------------------------------------------------
            if (savings.SavingsGoals is { Count: > 0 })
            {
                const string insertGoalSql = @"
                INSERT INTO SavingsGoal (Id, SavingsId, Name, TargetAmount, TargetDate, AmountSaved)
                VALUES (@Id, @SavingsId, @Name, @TargetAmount, @TargetDate, @AmountSaved);";

                foreach (var goal in savings.SavingsGoals)
                {
                    if (goal.Id == Guid.Empty)
                        goal.Id = Guid.NewGuid();

                    goal.SavingsId = savings.Id;

                    await ExecuteAsync(insertGoalSql, new
                    {
                        goal.Id,
                        goal.SavingsId,
                        goal.Name,
                        goal.TargetAmount,
                        // Use DateTime? to allow nulls (This needs to be tested later, // as it may not be nullable in the database schema)
                        goal.TargetDate,
                        goal.AmountSaved
                    });
                }
            }
        }
    }
}
