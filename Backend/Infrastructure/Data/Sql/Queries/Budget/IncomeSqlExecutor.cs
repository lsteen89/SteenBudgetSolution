using Backend.Domain.Entities.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries;
using Dapper;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public class IncomeSqlExecutor : SqlBase, IIncomeSqlExecutor
    {
        private readonly ILogger<IncomeSqlExecutor> _logger;

        public IncomeSqlExecutor(IUnitOfWork unitOfWork, ILogger<IncomeSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        public async Task InsertIncomeAndSubItemsAsync(Income income, Guid budgetId)
        {
            _logger.LogInformation("Inserting income for user {Persoid} with BudgetId {BudgetId}", income.Persoid, budgetId);

            // 1. Generate Primary Keys in the application
            income.Id = Guid.NewGuid(); // Give the main Income object its own new Guid PK
            income.BudgetId = budgetId; // Assign the BudgetId from the orchestrator

            // 2. Update the SQL to insert all necessary columns, including the new Guids.
            //    We use UUID_TO_BIN for efficient storage in MySQL.
            var incomeSql = @"
                INSERT INTO Income (Id, BudgetId, Persoid, NetSalary, SalaryFrequency, CreatedBy, CreatedTime)
                VALUES (@Id, @BudgetId, @Persoid, @NetSalary, @SalaryFrequency, @CreatedBy, @CreatedTime);";

            // 5. Use the new helper methods from SqlBase. No more passing conn/tx.
            await ExecuteAsync(incomeSql, income);

            // --- Handle Child Items ---

            foreach (var sideHustle in income.SideHustles)
            {
                sideHustle.Id = Guid.NewGuid(); // Give the child its own PK
                sideHustle.IncomeId = income.Id; // Assign the FK from the parent object we just created

                var sideHustleSql = @"
                    INSERT INTO SideHustle (Id, Name, MonthlyIncome, IncomeId)
                    VALUES (UUID_TO_BIN(@Id, 1), @Name, @MonthlyIncome, UUID_TO_BIN(@IncomeId, 1));";
                await ExecuteAsync(sideHustleSql, sideHustle);
            }

            foreach (var member in income.HouseholdMembers)
            {
                member.Id = Guid.NewGuid(); // Give the child its own PK
                member.IncomeId = income.Id; // Assign the FK

                var memberSql = @"
                    INSERT INTO HouseholdMember (Id, Name, IncomeAmount, IncomeFrequency, IncomeId)
                    VALUES (UUID_TO_BIN(@Id, 1), @Name, @IncomeAmount, @IncomeFrequency, UUID_TO_BIN(@IncomeId, 1));";
                await ExecuteAsync(memberSql, member);
            }

            _logger.LogInformation("Successfully inserted income and its child items for BudgetId {BudgetId}", budgetId);
        }
    }
}
