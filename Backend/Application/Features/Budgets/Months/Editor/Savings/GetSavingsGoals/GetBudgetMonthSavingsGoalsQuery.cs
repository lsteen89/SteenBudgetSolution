using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;

public sealed record GetBudgetMonthSavingsGoalsQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>, ITransactionalCommand;
