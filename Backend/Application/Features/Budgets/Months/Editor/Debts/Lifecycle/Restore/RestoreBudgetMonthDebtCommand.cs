using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Restore;

// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/restore`
//
// Route keeps `monthDebtId` instead of `sourceDebtId` to stay symmetric
// with the other lifecycle actions. The handler resolves `SourceDebtId`
// from the month row; archived sources keep their month row visible (with
// `ParticipationStatus = notIncluded`) so the FE can always navigate to
// this command from a row in the Arkiverad group.
public sealed record RestoreBudgetMonthDebtCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    bool ReIncludeCurrentMonth,
    string? Note)
    : IRequest<Result<BudgetMonthDebtLifecycleActionResponseDto?>>, ITransactionalCommand;
