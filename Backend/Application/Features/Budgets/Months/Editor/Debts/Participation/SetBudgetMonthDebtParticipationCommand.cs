using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;

// MediatR command for
// `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/participation`
// (Debt PR 4).
//
// Distinct from the planned-payment, balance, and metadata commands so the
// "saldo påverkas inte här" / "planerad betalning räknas inte i månadens
// total, men du är fortfarande skyldig saldot" promises stay enforceable —
// only this command touches `ParticipationStatus`, and it never moves
// planned payment or balance.
//
// `ITransactionalCommand` because the participation UPDATE and the
// `BudgetMonthChangeEvent` audit insert must commit or roll back as one
// unit via the UnitOfWork pipeline.
public sealed record SetBudgetMonthDebtParticipationCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    string Participation,
    string? Note)
    : IRequest<Result<BudgetMonthDebtLifecycleActionResponseDto?>>, ITransactionalCommand;
