using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;

public sealed record GetBudgetMonthDebtsQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>, ITransactionalCommand;
