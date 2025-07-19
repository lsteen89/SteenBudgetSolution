using Backend.Domain.Entities.Budget.Income;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries
{
    public interface IIncomeSqlExecutor
    {
        Task InsertIncomeAndSubItemsAsync(Income income, Guid budgetId);
    }
}
