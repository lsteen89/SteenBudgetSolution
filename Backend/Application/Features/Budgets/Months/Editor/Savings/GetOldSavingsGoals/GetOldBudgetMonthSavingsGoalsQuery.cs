using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;

public sealed record GetOldBudgetMonthSavingsGoalsQuery(
    Guid Persoid,
    string YearMonth)
    : IRequest<Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>>, ITransactionalCommand;
