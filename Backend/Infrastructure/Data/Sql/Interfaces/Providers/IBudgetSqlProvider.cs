using Backend.Domain.Entities.Budget;
using System.Data;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Providers
{
    public interface IBudgetSqlProvider
    {
        Task InsertIncomeAsync(Income income, IDbConnection connection, IDbTransaction transaction);
    }
}