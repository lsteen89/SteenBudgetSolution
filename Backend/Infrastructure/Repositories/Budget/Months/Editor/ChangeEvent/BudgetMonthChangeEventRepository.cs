using Microsoft.Extensions.Options;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;

namespace Backend.Infrastructure.Repositories.Budget.Months.Editor.ChangeEvent;

public sealed partial class BudgetMonthChangeEventRepository : SqlBase, IBudgetMonthChangeEventRepository
{
    public BudgetMonthChangeEventRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthChangeEventRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task InsertAsync(BudgetMonthChangeEventWriteModel model, CancellationToken ct)
        => ExecuteAsync(InsertChangeEvent, model, ct);
}