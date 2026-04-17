using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthChangeEventRepository
{
    Task InsertAsync(BudgetMonthChangeEventWriteModel model, CancellationToken ct);
}