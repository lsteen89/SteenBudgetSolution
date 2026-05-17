using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;

public sealed record CreateBudgetMonthSavingsGoalCommand(
    Guid Persoid,
    string YearMonth,
    string Name,
    decimal TargetAmount,
    DateOnly? TargetDate,
    decimal? AmountSaved,
    decimal MonthlyContribution)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
