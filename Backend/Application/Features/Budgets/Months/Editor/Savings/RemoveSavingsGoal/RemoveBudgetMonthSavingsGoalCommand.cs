using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsGoal;

public sealed record RemoveBudgetMonthSavingsGoalCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
