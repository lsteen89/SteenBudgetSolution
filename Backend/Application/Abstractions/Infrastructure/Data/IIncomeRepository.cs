using Backend.Application.Features.Budgets.Income.Models;
using Backend.Domain.Entities.Budget.Income;

namespace Backend.Application.Abstractions.Infrastructure.Data
{
    public interface IIncomeRepository
    {
        Task AddAsync(Income income, Guid budgetId, CancellationToken ct);
        Task<IncomePaymentTimingReadModel?> GetPaymentTimingAsync(Guid budgetId, CancellationToken ct);
        Task<int> UpdatePaymentTimingAsync(
            Guid budgetId,
            string incomePaymentDayType,
            int? incomePaymentDay,
            Guid actorPersoid,
            DateTime nowUtc,
            CancellationToken ct);
    }
}
