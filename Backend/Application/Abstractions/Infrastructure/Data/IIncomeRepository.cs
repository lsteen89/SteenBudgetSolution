using Backend.Domain.Entities.Budget.Income;
using System.Data;
using System.Threading.Tasks;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IIncomeRepository
    {
        Task AddAsync(Income income, Guid budgetId, CancellationToken ct);
    }
}