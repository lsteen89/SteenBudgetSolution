using Backend.Domain.Entities.Budget.Expenditure;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface IExpenditureRepository
    {
        Task AddAsync(Expenditure expenditure, Guid budgetId);
    }
}
