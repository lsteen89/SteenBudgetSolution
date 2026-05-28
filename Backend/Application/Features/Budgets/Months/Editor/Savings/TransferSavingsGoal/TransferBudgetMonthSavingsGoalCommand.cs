using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;

/// <summary>
/// V2 PR-07 — Engångsöverföring (deposit/withdraw) against a savings
/// goal's running balance. The signed delta is computed in the handler
/// from <see cref="Amount"/> + <see cref="Direction"/> so the wire shape
/// stays explicit and the validator can keep amount > 0 unconditionally.
/// </summary>
public sealed record TransferBudgetMonthSavingsGoalCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId,
    decimal Amount,
    string Direction,
    string? Note)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
