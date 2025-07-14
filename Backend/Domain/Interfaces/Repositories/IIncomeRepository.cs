using Backend.Domain.Entities.Budget;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Domain.Interfaces.Repositories
{
    public interface IIncomeRepository
    {
        Task AddAsync(Income income, IDbConnection connection, IDbTransaction transaction);
    }
}