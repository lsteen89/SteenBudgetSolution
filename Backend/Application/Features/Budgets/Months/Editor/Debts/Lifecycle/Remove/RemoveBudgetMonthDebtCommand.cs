using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Remove;

// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/remove`
//
// Month-only rows only. Source-linked rows must use archive instead so
// history is preserved.
public sealed record RemoveBudgetMonthDebtCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    string? Note)
    : IRequest<Result<BudgetMonthDebtLifecycleActionResponseDto?>>, ITransactionalCommand;
