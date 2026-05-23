using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.AddSavingsMethod;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CancelSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CompleteSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsMethods;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsMethod;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/savings-goals")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>> GetSavingsGoals(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthSavingsGoalsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOALS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month savings goals."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Success(result.Value));
    }

    [HttpGet("months/{yearMonth}/savings-goals/old")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>>> GetOldSavingsGoals(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetOldBudgetMonthSavingsGoalsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOALS_OLD_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load previous month savings goals."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>.Success(result.Value));
    }

    [HttpGet("months/{yearMonth}/savings-methods")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<SavingsMethodDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<SavingsMethodDto>>>> GetSavingsMethods(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthSavingsMethodsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<SavingsMethodDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_METHODS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month savings methods."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<SavingsMethodDto>>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/savings-methods")]
    [ProducesResponseType(typeof(ApiEnvelope<SavingsMethodDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<SavingsMethodDto>>> AddSavingsMethod(
        [FromRoute] string yearMonth,
        [FromBody] AddSavingsMethodRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new AddSavingsMethodCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Code: req.Code,
                CustomLabel: req.CustomLabel),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<SavingsMethodDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_METHOD_ADD_FAILED",
                message: result.Error?.Message ?? "Could not add savings method."
            ));
        }

        return Ok(ApiEnvelope<SavingsMethodDto>.Success(result.Value));
    }

    [HttpDelete("months/{yearMonth}/savings-methods/{savingsMethodId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<object>>> RemoveSavingsMethod(
        [FromRoute] string yearMonth,
        [FromRoute] Guid savingsMethodId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RemoveSavingsMethodCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                SavingsMethodId: savingsMethodId),
            ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<object>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_METHOD_REMOVE_FAILED",
                message: result.Error?.Message ?? "Could not remove savings method."
            ));
        }

        return Ok(ApiEnvelope<object>.Success(new { deleted = result.Value }));
    }

    [HttpPost("months/{yearMonth}/savings-goals")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>>> CreateSavingsGoal(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthSavingsGoalRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthSavingsGoalCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Name: req.Name,
                TargetAmount: req.TargetAmount,
                TargetDate: req.TargetDate,
                AmountSaved: req.AmountSaved,
                MonthlyContribution: req.MonthlyContribution),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOAL_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create month savings goal."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>>> PatchSavingsGoal(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthSavingsGoalId,
        [FromBody] PatchBudgetMonthSavingsGoalRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthSavingsGoalCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthSavingsGoalId: monthSavingsGoalId,
                MonthlyContribution: req.MonthlyContribution,
                TargetDate: req.TargetDate,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOAL_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month savings goal."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/savings-goals")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>> PatchSavingsGoalsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthSavingsGoalsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthSavingsGoalBulkRowDto>())
            .Select(item => new PatchBudgetMonthSavingsGoalsBulkCommand.Row(
                MonthSavingsGoalId: item.MonthSavingsGoalId,
                MonthlyContribution: item.MonthlyContribution,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthSavingsGoalsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOALS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month savings goals."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/complete")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>>> CompleteSavingsGoal(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthSavingsGoalId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CompleteBudgetMonthSavingsGoalCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthSavingsGoalId: monthSavingsGoalId),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOAL_COMPLETE_FAILED",
                message: result.Error?.Message ?? "Could not complete savings goal."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/cancel")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>>> CancelSavingsGoal(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthSavingsGoalId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CancelBudgetMonthSavingsGoalCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthSavingsGoalId: monthSavingsGoalId),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOAL_CANCEL_FAILED",
                message: result.Error?.Message ?? "Could not cancel savings goal."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/base-savings")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthBaseSavingsEditorDto>>> PatchBaseSavings(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthBaseSavingsRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthBaseSavingsCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                AmountMonthly: req.AmountMonthly,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_BASE_SAVINGS_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update base savings."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/remove")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>>> RemoveSavingsGoal(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthSavingsGoalId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RemoveBudgetMonthSavingsGoalCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthSavingsGoalId: monthSavingsGoalId),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_SAVINGS_GOAL_REMOVE_FAILED",
                message: result.Error?.Message ?? "Could not remove savings goal."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>.Success(result.Value));
    }
}
