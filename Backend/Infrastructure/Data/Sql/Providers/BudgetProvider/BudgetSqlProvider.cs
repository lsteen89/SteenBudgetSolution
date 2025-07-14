using Backend.Domain.Entities.Budget;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Dapper;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Providers.BudgetProvider
{
    public class BudgetSqlProvider : IBudgetSqlProvider
    {
        private readonly ILogger<BudgetSqlProvider> _logger;

        public BudgetSqlProvider(ILogger<BudgetSqlProvider> logger)
        {
            _logger = logger;
        }

        public async Task InsertIncomeAsync(Income income, IDbConnection connection, IDbTransaction transaction)
        {
            _logger.LogInformation("Inserting income for user {Persoid}", income.Persoid);

            var incomeSql = @"
                INSERT INTO Income (Persoid, NetSalary, SalaryFrequency, CreatedBy, CreatedTime)
                VALUES (@Persoid, @NetSalary, @SalaryFrequency, @CreatedBy, @CreatedTime);
                SELECT LAST_INSERT_ID();";

            var incomeId = await connection.ExecuteScalarAsync<int>(incomeSql, income, transaction);

            foreach (var sideHustle in income.SideHustles)
            {
                sideHustle.IncomeId = incomeId;
                var sideHustleSql = @"
                    INSERT INTO SideHustle (Name, MonthlyIncome, IncomeId)
                    VALUES (@Name, @MonthlyIncome, @IncomeId);";
                await connection.ExecuteAsync(sideHustleSql, sideHustle, transaction);
            }

            foreach (var member in income.HouseholdMembers)
            {
                member.IncomeId = incomeId;
                var memberSql = @"
                    INSERT INTO HouseholdMember (Name, IncomeAmount, IncomeFrequency, IncomeId)
                    VALUES (@Name, @IncomeAmount, @IncomeFrequency, @IncomeId);";
                await connection.ExecuteAsync(memberSql, member, transaction);
            }

            _logger.LogInformation("Successfully inserted income, {SideHustleCoount} side hustles, and {HouseholdMemberCount} household members for user {Persoid}",
                income.SideHustles.Count,
                income.HouseholdMembers.Count,
                income.Persoid);
        }
    }
}