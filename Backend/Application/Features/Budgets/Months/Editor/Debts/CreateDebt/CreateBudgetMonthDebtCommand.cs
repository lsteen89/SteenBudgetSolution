using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.CreateDebt;

// MediatR command for `POST /api/budgets/months/{yearMonth}/debt-items` (Debt PR 2).
//
// Scope semantics:
//   currentMonthOnly          → month-only `BudgetMonthDebt` row, SourceDebtId = null
//   currentMonthAndBudgetPlan → baseline `Debt` plan row + linked month row
//   budgetPlanOnly            → baseline `Debt` plan row only; future months pick it
//                               up via the materializer. The current open month is
//                               left untouched on purpose — the row should not appear
//                               in this month's totals.
//
// `Scope` defaults to `currentMonthOnly` when null (matches Income's create
// fallback and the validator's IsSupported check).
//
// Marked `ITransactionalCommand` so the create runs inside the UnitOfWork
// pipeline behavior — the plan-row insert + month-row insert + audit event
// either all commit or all roll back.
public sealed record CreateBudgetMonthDebtCommand(
    Guid Persoid,
    string YearMonth,
    string Name,
    string Type,
    decimal Balance,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    string? Scope = null)
    : IRequest<Result<CreateBudgetMonthDebtResponseDto?>>, ITransactionalCommand;
