using Backend.Domain.Entities.Budget.Savings;
using System.Threading.Tasks;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface ISavingsRepository
    {
        Task AddAsync(Savings savings, Guid budgetId, CancellationToken ct);
    }
}
