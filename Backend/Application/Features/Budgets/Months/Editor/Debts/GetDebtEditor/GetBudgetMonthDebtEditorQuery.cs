using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;

// Debt PR 5: query for the target editor read model. `ITransactionalCommand`
// mirrors the legacy `GetBudgetMonthDebtsQuery` — the read needs to run
// inside the UnitOfWork pipeline because `BudgetMonthLifecycleService`'s
// "ensure accessible month" path can materialize rows on first read, and
// every repository call below ultimately goes through `SqlBase` which
// requires an ambient transaction.
public sealed record GetBudgetMonthDebtEditorQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<BudgetMonthDebtEditorDto?>>, ITransactionalCommand;
