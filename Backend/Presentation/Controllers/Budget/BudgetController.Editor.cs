using Backend.Application.DTO.Budget.Months.Editor.Expense;
using Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Queries;
using Backend.Application.DTO.Budget.Months.Editor;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;
using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;
using Backend.Application.Features.Budgets.Months.Editor.Expense.DeleteExpenseItem;
using Backend.Application.DTO.Budget.Months.Editor.Income;
using Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.GetIncomeItems;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CancelSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CompleteSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;
using Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsGoal;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;


namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("months/{yearMonth}/editor")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthEditorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthEditorDto>>> GetMonthEditor(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthEditorQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthEditorDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EDITOR_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load budget month editor."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthEditorDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/expense-items/{monthExpenseItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>> PatchExpenseItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthExpenseItemId,
        [FromBody] PatchBudgetMonthExpenseItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthExpenseItemId: monthExpenseItemId,
                Name: req.Name,
                CategoryId: req.CategoryId,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive,
                SubscriptionLifecycleStatus: req.SubscriptionLifecycleStatus,
                UpdateDefault: req.UpdateDefault,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month expense item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/expense-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>>> PatchExpenseItemsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthExpenseItemsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthExpenseItemBulkRowDto>())
            .Select(item => new PatchBudgetMonthExpenseItemsBulkCommand.Row(
                MonthExpenseItemId: item.MonthExpenseItemId,
                Name: item.Name,
                CategoryId: item.CategoryId,
                AmountMonthly: item.AmountMonthly,
                IsActive: item.IsActive,
                SubscriptionLifecycleStatus: item.SubscriptionLifecycleStatus,
                UpdateDefault: item.UpdateDefault,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthExpenseItemsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEMS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month expense items."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthExpenseItemEditorRowDto>>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/expense-items")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>>> CreateExpenseItem(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthExpenseItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                CategoryId: req.CategoryId,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create month expense item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthExpenseItemEditorRowDto>.Success(result.Value));
    }

    [HttpDelete("months/{yearMonth}/expense-items/{monthExpenseItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<object>>> DeleteExpenseItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthExpenseItemId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new DeleteBudgetMonthExpenseItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthExpenseItemId: monthExpenseItemId),
            ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<object>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_EXPENSE_ITEM_DELETE_FAILED",
                message: result.Error?.Message ?? "Could not delete month expense item."
            ));
        }

        return Ok(ApiEnvelope<object>.Success(new { deleted = true }));
    }

    [HttpGet("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>> GetIncomeItems(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthIncomeItemsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEMS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month income items."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(result.Value));
    }

    [HttpPost("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>>> CreateIncomeItem(
        [FromRoute] string yearMonth,
        [FromBody] CreateBudgetMonthIncomeItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new CreateBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Kind: req.Kind,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_CREATE_FAILED",
                message: result.Error?.Message ?? "Could not create month income item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/income-items/{monthIncomeItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>>> PatchIncomeItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthIncomeItemId,
        [FromBody] PatchBudgetMonthIncomeItemRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthIncomeItemId: monthIncomeItemId,
                Name: req.Name,
                AmountMonthly: req.AmountMonthly,
                IsActive: req.IsActive,
                UpdateDefault: req.UpdateDefault,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month income item."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthIncomeItemEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/income-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>>> PatchIncomeItemsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthIncomeItemsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthIncomeItemBulkRowDto>())
            .Select(item => new PatchBudgetMonthIncomeItemsBulkCommand.Row(
                MonthIncomeItemId: item.MonthIncomeItemId,
                Name: item.Name,
                AmountMonthly: item.AmountMonthly,
                IsActive: item.IsActive,
                UpdateDefault: item.UpdateDefault,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthIncomeItemsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEMS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month income items."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthIncomeItemEditorRowDto>>.Success(result.Value));
    }

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

    [HttpGet("months/{yearMonth}/debt-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>> GetDebtItems(
        [FromRoute] string yearMonth,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetBudgetMonthDebtsQuery(_currentUser.Persoid, yearMonth),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEMS_NOT_FOUND",
                message: result.Error?.Message ?? "Could not load month debts."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/debt-items/{monthDebtId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<BudgetMonthDebtEditorRowDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<BudgetMonthDebtEditorRowDto>>> PatchDebtItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthDebtId,
        [FromBody] PatchBudgetMonthDebtRequestDto req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new PatchBudgetMonthDebtCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthDebtId: monthDebtId,
                MonthlyPayment: req.MonthlyPayment,
                Scope: req.Scope),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEM_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month debt."
            ));
        }

        return Ok(ApiEnvelope<BudgetMonthDebtEditorRowDto>.Success(result.Value));
    }

    [HttpPatch("months/{yearMonth}/debt-items")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>> PatchDebtItemsBulk(
        [FromRoute] string yearMonth,
        [FromBody] PatchBudgetMonthDebtsBulkRequestDto req,
        CancellationToken ct)
    {
        var rows = (req?.Items ?? Array.Empty<PatchBudgetMonthDebtBulkRowDto>())
            .Select(item => new PatchBudgetMonthDebtsBulkCommand.Row(
                MonthDebtId: item.MonthDebtId,
                MonthlyPayment: item.MonthlyPayment,
                Scope: item.Scope))
            .ToList();

        var result = await _mediator.Send(
            new PatchBudgetMonthDebtsBulkCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                Items: rows),
            ct);

        if (result.IsFailure || result.Value is null)
        {
            return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_DEBT_ITEMS_BULK_PATCH_FAILED",
                message: result.Error?.Message ?? "Could not update month debts."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(result.Value));
    }

    [HttpDelete("months/{yearMonth}/income-items/{monthIncomeItemId:guid}")]
    [ProducesResponseType(typeof(ApiEnvelope<object>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<object>>> DeleteIncomeItem(
        [FromRoute] string yearMonth,
        [FromRoute] Guid monthIncomeItemId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new DeleteBudgetMonthIncomeItemCommand(
                Persoid: _currentUser.Persoid,
                YearMonth: yearMonth,
                MonthIncomeItemId: monthIncomeItemId),
            ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<object>.Failure(
                code: result.Error?.Code ?? "BUDGET_MONTH_INCOME_ITEM_DELETE_FAILED",
                message: result.Error?.Message ?? "Could not delete month income item."
            ));
        }

        return Ok(ApiEnvelope<object>.Success(new { deleted = true }));
    }
}
