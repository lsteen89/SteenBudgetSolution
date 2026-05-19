using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.Lifecycle;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.CancelSavingsGoal;

public sealed class CancelBudgetMonthSavingsGoalCommandHandler
    : IRequestHandler<CancelBudgetMonthSavingsGoalCommand, Result<BudgetMonthSavingsGoalEditorRowDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly IBudgetMonthChangeEventRepository _changeEvents;
    private readonly TimeProvider _timeProvider;

    public CancelBudgetMonthSavingsGoalCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        IBudgetMonthChangeEventRepository changeEvents,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _changeEvents = changeEvents;
        _timeProvider = timeProvider;
    }

    public Task<Result<BudgetMonthSavingsGoalEditorRowDto?>> Handle(
        CancelBudgetMonthSavingsGoalCommand cmd,
        CancellationToken ct)
        => BudgetMonthSavingsGoalLifecycleHandler.ApplyAsync(
            _lifecycle,
            _repo,
            _changeEvents,
            _timeProvider,
            cmd.Persoid,
            cmd.YearMonth,
            cmd.MonthSavingsGoalId,
            SavingsGoalLifecycleActions.Cancel,
            ct);
}
