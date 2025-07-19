using Backend.Domain.Entities.Budget.Savings;
using System.Threading.Tasks;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface ISavingsRepository
    {
        Task AddAsync(Savings savings, Guid budgetId);
    }
}
