using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Archive;

// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/archive`
//
// Archive is the "hide from normal planning, keep the history" command. It
// never touches balance — a debt the user hides is still owed; restoring
// later must surface that fact exactly as it was. Source-link required.
public sealed record ArchiveBudgetMonthDebtCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    string? Note)
    : IRequest<Result<BudgetMonthDebtLifecycleActionResponseDto?>>, ITransactionalCommand;
