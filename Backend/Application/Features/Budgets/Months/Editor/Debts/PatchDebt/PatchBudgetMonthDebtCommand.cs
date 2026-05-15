using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;

public sealed record PatchBudgetMonthDebtCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthDebtId,
    decimal MonthlyPayment,
    string? Scope = null)
    : IRequest<Result<BudgetMonthDebtEditorRowDto?>>, ITransactionalCommand;
