using Backend.Domain.Entities.Budget.Income;
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
            _logger.LogInformation("Inserting income for BudgetId {BudgetId}.", budgetId);

            if (income.Id == Guid.Empty)
                income.Id = Guid.NewGuid();
            income.BudgetId = budgetId;

            const string insertIncomeSql = @"
            INSERT INTO Income (Id, BudgetId, NetSalaryMonthly, SalaryFrequency)
            VALUES (@Id, @BudgetId, @NetSalaryMonthly, @SalaryFrequency);";

            await ExecuteAsync(insertIncomeSql, new
            {
                income.Id,
                income.BudgetId,
                income.NetSalaryMonthly,
                income.SalaryFrequency
            });

            // Side Hustles
            if (income.SideHustles?.Count > 0)
            {
                const string insertSideSql = @"
                INSERT INTO IncomeSideHustle (Id, IncomeId, Name, IncomeMonthly, Frequency)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency);";

                foreach (var sh in income.SideHustles)
                {
                    sh.Id = Guid.NewGuid();
                    sh.IncomeId = income.Id;

                    await ExecuteAsync(insertSideSql, new
                    {
                        sh.Id,
                        sh.IncomeId,
                        sh.Name,
                        sh.IncomeMonthly,
                        sh.Frequency
                    });
                }
            }

            // Household Members
            if (income.HouseholdMembers?.Count > 0)
            {
                const string insertMemberSql = @"
                INSERT INTO IncomeHouseholdMember (Id, IncomeId, Name, IncomeMonthly, Frequency)
                VALUES (@Id, @IncomeId, @Name, @IncomeMonthly, @Frequency);";

                foreach (var hm in income.HouseholdMembers)
                {
                    hm.Id = Guid.NewGuid();
                    hm.IncomeId = income.Id;

                    await ExecuteAsync(insertMemberSql, new
                    {
                        hm.Id,
                        hm.IncomeId,
                        hm.Name,
                        hm.IncomeMonthly,
                        hm.Frequency
                    });
                }
            }

            _logger.LogInformation(
                "Inserted income + {SideCount} side hustles + {MemberCount} household members for BudgetId {BudgetId}.",
                income.SideHustles?.Count ?? 0,
                income.HouseholdMembers?.Count ?? 0,
                budgetId);
        }
    }
}

