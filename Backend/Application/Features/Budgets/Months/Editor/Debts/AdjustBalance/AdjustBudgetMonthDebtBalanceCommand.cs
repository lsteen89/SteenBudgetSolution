using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;

// MediatR command for
// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/balance-adjustments`
// (Debt PR 3).
//
// Distinct from `PatchBudgetMonthDebtCommand` (planned payment) and
// `PatchBudgetMonthDebtDetailsCommand` (metadata) so balance changes carry
// their own audit shape (`DebtBalanceEvent`) and the editor can keep the
// "saldo påverkas inte här" callout truthful — a planned-payment edit can
// never accidentally move the balance, and a balance update can never
// accidentally move the planned payment.
//
// Marked `ITransactionalCommand` so the optional month-side UPDATE, optional
// plan-side UPDATE, the typed `DebtBalanceEvent` insert(s), and the
// month-side `BudgetMonthChangeEvent` insert all commit or roll back as one
// unit via the UnitOfWork pipeline.
public sealed record AdjustBudgetMonthDebtBalanceCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    decimal NewBalance,
    string? Scope,
    string? Note)
    : IRequest<Result<AdjustBudgetMonthDebtBalanceResponseDto?>>, ITransactionalCommand;
