using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.MarkPaidOff;

// MediatR command for
// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/mark-paid-off`
// (Debt PR 4).
//
// Splits two facts into two audit rows: the lifecycle transition is a
// `BudgetMonthChangeEvent`, and the optional balance-to-zero is one or two
// `DebtBalanceEvent` rows (one per side that moved). Collapsing the two
// into a single JSON blob would force PR 5 / PR 9 to parse JSON to get a
// numeric delta — exactly what the structured `DebtBalanceEvent` table
// exists to avoid.
public sealed record MarkBudgetMonthDebtPaidOffCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    bool SetBalanceToZero,
    string? Note)
    : IRequest<Result<BudgetMonthDebtLifecycleActionResponseDto?>>, ITransactionalCommand;
