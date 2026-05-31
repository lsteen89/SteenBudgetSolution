using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Abstractions;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.Debts;

public sealed partial class DebtBalanceEventRepository
    : SqlBase, IDebtBalanceEventRepository
{
    public DebtBalanceEventRepository(
        IUnitOfWork unitOfWork,
        ILogger<DebtBalanceEventRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task InsertAsync(DebtBalanceEventWriteModel model, CancellationToken ct)
        => ExecuteAsync(InsertDebtBalanceEvent, model, ct);
}
