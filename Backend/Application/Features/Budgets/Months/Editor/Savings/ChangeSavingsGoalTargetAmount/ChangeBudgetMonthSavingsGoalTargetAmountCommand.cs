using Backend.Application.Common.Behaviors;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;

public sealed record ChangeBudgetMonthSavingsGoalTargetAmountCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId,
    decimal TargetAmount)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
