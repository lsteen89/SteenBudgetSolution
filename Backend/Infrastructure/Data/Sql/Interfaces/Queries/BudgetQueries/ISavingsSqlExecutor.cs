using Backend.Domain.Entities.Budget.Savings;
using System.Threading.Tasks;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries.Budget
{
    public interface ISavingsSqlExecutor
    {
        Task AddSavingsAsync(Savings savings, Guid budgetId);
    }
}
