using Backend.Domain.Abstractions;
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

    public sealed class IncomeSqlExecutor : SqlBase, IIncomeSqlExecutor
    {
        private readonly ICurrentUserContext _currentUser;
        public IncomeSqlExecutor(IUnitOfWork unitOfWork, ILogger<IncomeSqlExecutor> logger, ICurrentUserContext currentUser)
            : base(unitOfWork, logger) 
        { 
            _currentUser = currentUser;
        }

        #region SQL Queries Insert
        // SQL query to insert the main income record
        const string insertIncomeSql = @"
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency, CreatedByUserId)
            VALUES (@Id, @BudgetId, @NetSalaryMonthly, @SalaryFrequency, @CreatedByUserId);";

        // SQL query to insert side hustles
        const string insertSideSql = @"
                INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @CreatedByUserId);";

        // SQL query to insert household members
        const string insertMemberSql = @"
                INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency, CreatedByUserId)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency, @CreatedByUserId);";
        #endregion

        public async Task InsertIncomeAndSubItemsAsync(Income income, Guid budgetId)
        {
            var createdByUserId = _currentUser.Persoid;
            if (createdByUserId == Guid.Empty)
                throw new InvalidOperationException("Current user context is not set.");

            _logger.LogInformation("Inserting income record for BudgetId {BudgetId}.", budgetId);

            // 1. Prepare and Insert the parent record
            if (income.Id == Guid.Empty)
                income.Id = Guid.NewGuid();
            
            income.BudgetId = budgetId;
            income.CreatedByUserId = createdByUserId;


            await ExecuteAsync(insertIncomeSql, income);


            // 2. Handle Side Hustles completely
            if (income.SideHustles?.Count > 0)
            {
                // a. Prepare the children
                foreach (var sh in income.SideHustles)
                {
                    sh.Id = Guid.NewGuid();
                    sh.IncomeId = income.Id;
                    sh.CreatedByUserId = createdByUserId;
                }
                // b. Insert the children
                await ExecuteAsync(insertSideSql, income.SideHustles);
            }


            // 3. Handle Household Members completely
            if (income.HouseholdMembers?.Count > 0)
            {
                // a. Prepare the children
                foreach (var hm in income.HouseholdMembers)
                {
                    hm.Id = Guid.NewGuid();
                    hm.IncomeId = income.Id;
                    hm.CreatedByUserId = createdByUserId;
                }
                // b. Insert the children
                await ExecuteAsync(insertMemberSql, income.HouseholdMembers);
            }

            _logger.LogInformation(
                "Successfully inserted income + {SideCount} side hustles + {MemberCount} household members for BudgetId {BudgetId}.",
                income.SideHustles?.Count ?? 0,
                income.HouseholdMembers?.Count ?? 0,
                budgetId);
        }
    }
}

