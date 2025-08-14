using Microsoft.AspNetCore.Mvc;
using Backend.Presentation.Shared; // For ApiResponse

namespace Backend.Domain.Shared;

public static class ResultExtensions
{
    // generic Result<T>
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsFailure)
        {
            return new BadRequestObjectResult(new ApiErrorResponse(result.Error.Code, result.Error.Description));
        }

        if (result.Value is null)
        {
            return new NotFoundResult();
        }

        return new OkObjectResult(new ApiResponse<T>(result.Value));
    }

    // non-generic Result
    public static IActionResult ToCommandResult(this Result result, string successMessage)
    {
        if (result.IsFailure)
        {
            return result.Error.Code switch
            {
                "Validation.Failed" => new BadRequestObjectResult(new ApiErrorResponse(result.Error.Code, result.Error.Description)),
                "Wizard.ValidatorNotFound" => new BadRequestObjectResult(new ApiErrorResponse(result.Error.Code, result.Error.Description)),
                _ => new StatusCodeResult(StatusCodes.Status500InternalServerError)
            };
        }

        return new OkObjectResult(new { message = successMessage });
    }
}