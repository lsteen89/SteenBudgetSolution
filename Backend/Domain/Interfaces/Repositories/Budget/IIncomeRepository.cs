using Backend.Domain.Entities.Budget.Income;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Domain.Interfaces.Repositories.Budget
{
    public interface IIncomeRepository
    {
        Task AddAsync(Income income, Guid budgetId);
    }
}