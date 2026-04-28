using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Audit.Models;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Audit;

public sealed partial class BudgetAuditWriter : SqlBase, IBudgetAuditWriter
{
    public BudgetAuditWriter(
        IUnitOfWork unitOfWork,
        ILogger<BudgetAuditWriter> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task WriteConfigChangeAsync(BudgetConfigChangeEventWriteModel model, CancellationToken ct)
        => ExecuteAsync(InsertConfigChangeEvent, model, ct);

    public Task WriteLifecycleAsync(BudgetMonthLifecycleEventWriteModel model, CancellationToken ct)
        => ExecuteAsync(InsertLifecycleEvent, model, ct);
}
