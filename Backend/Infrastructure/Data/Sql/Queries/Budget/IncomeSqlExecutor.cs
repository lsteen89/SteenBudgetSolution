using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget;
using Dapper;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Queries.Budget
{
    public class IncomeSqlExecutor : SqlBase, IIncomeSqlExecutor
    {
        public IncomeSqlExecutor(IUnitOfWork unitOfWork, ILogger<IncomeSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        #region SQL Queries Insert
        // SQL query to insert the main income record
        const string insertIncomeSql = @"
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency)
            VALUES (@Id, @BudgetId, @NetSalaryMonthly, @SalaryFrequency);";

        // SQL query to insert side hustles
        const string insertSideSql = @"
                INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency);";

        // SQL query to insert household members
        const string insertMemberSql = @"
                INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency);";
        #endregion

        public async Task InsertIncomeAndSubItemsAsync(Income income, Guid budgetId)
        {
            _logger.LogInformation("Inserting income for BudgetId {BudgetId}.", budgetId);

            // Set PK
            if (income.Id == Guid.Empty)
                income.Id = Guid.NewGuid();

            // ensure the income record is associated with the budget
            income.BudgetId = budgetId;

            await ExecuteAsync(insertIncomeSql, new
            {
                income.Id,
                income.BudgetId,
                income.NetSalaryMonthly,
                income.SalaryFrequency
            });

            // Prepare the children before the call.
            // Make sure every side hustle knows who their daddy is and has their own ID.

            // Side Hustles
            if (income.SideHustles?.Count > 0)
            {

                foreach (var sh in income.SideHustles)
                {
                    sh.Id = Guid.NewGuid();
                    sh.IncomeId = income.Id;
                }
            }

            // Household Members
            if (income.HouseholdMembers?.Count > 0)
            {
                foreach (var hm in income.HouseholdMembers)
                {
                    hm.Id = Guid.NewGuid();
                    hm.IncomeId = income.Id;
                }
            }

            // Insert the data, parent first, then children.
            // Insert the main savings record.
            await ExecuteAsync(insertIncomeSql, income);

            // Side Hustles
            if (income.SideHustles.Any())
            {
                // Dapper is smart enough to run this for every item in the list.
                await ExecuteAsync(insertSideSql, income.SideHustles);
            }

            // Household Members
            if (income.HouseholdMembers.Any())
            {

                // Same deal here. One call, many inserts.
                await ExecuteAsync(insertMemberSql, income.HouseholdMembers);
            }

            _logger.LogInformation(
                "Inserted income + {SideCount} side hustles + {MemberCount} household members for BudgetId {BudgetId}.",
                income.SideHustles?.Count ?? 0,
                income.HouseholdMembers?.Count ?? 0,
                budgetId);
        }
    }
}

