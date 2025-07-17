using Backend.Domain.Entities.Budget.Expenditure;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries
{
    public interface IExpenditureSqlExecutor
    {
        Task InsertExpenditureAsync(Expenditure expenditure, Guid budgetId);
    }
}
