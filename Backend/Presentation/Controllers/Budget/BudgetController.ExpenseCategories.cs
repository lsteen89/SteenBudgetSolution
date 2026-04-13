using Backend.Application.DTO.Budget.ExpenseCategories;
using Backend.Application.Features.Budgets.ExpenseCategories.GetExpenseCategories;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Controllers;

public sealed partial class BudgetController
{
    [HttpGet("expense-categories")]
    [ProducesResponseType(typeof(ApiEnvelope<IReadOnlyList<ExpenseCategoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiEnvelope<IReadOnlyList<ExpenseCategoryDto>>>> GetExpenseCategories(
        CancellationToken ct)
    {
        var result = await _mediator.Send(new GetExpenseCategoriesQuery(), ct);

        if (result.IsFailure)
        {
            return Ok(ApiEnvelope<IReadOnlyList<ExpenseCategoryDto>>.Failure(
                code: result.Error?.Code ?? "EXPENSE_CATEGORIES_LOAD_FAILED",
                message: result.Error?.Message ?? "Could not load expense categories."
            ));
        }

        return Ok(ApiEnvelope<IReadOnlyList<ExpenseCategoryDto>>.Success(
            result.Value ?? Array.Empty<ExpenseCategoryDto>()));
    }
}
