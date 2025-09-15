using Backend.Domain.Shared;
using Microsoft.AspNetCore.Mvc;
using Backend.Domain.Enums;

// 👇 Ensure this namespace matches your other files in this folder
namespace Backend.Presentation.Shared;

/// <summary>
/// Contains extension methods for converting a Result object into a standardized API response.
/// </summary>
public static class ApiResultExtensions
{
    /// <summary>
    /// Converts a generic Result<TValue> into an ActionResult containing a standardized API response.
    /// </summary>
    public static ActionResult<ApiResponse<TValue>> ToApiResponse<TValue>(this Result<TValue> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(new ApiResponse<TValue>(result.Value));
        }

        var errorResponse = new ApiErrorResponse(result.Error.Code, result.Error.Description);

        // This switch translates the domain error type to an HTTP status code
        return result.Error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(errorResponse),
            ErrorType.Conflict => new ConflictObjectResult(errorResponse),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(errorResponse),
            _ => new BadRequestObjectResult(errorResponse) // Default for Validation errors
        };
    }
    public static ActionResult ToApiResponse(this Result result)
    {
        if (result.IsSuccess)
        {
            // For a successful command that returns no data,
            // HTTP 204 No Content is the correct response.
            return new NoContentResult();
        }

        var errorResponse = new ApiErrorResponse(result.Error.Code, result.Error.Description);

        // We use the same error handling logic
        return result.Error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(errorResponse),
            ErrorType.Conflict => new ConflictObjectResult(errorResponse),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(errorResponse),
            _ => new BadRequestObjectResult(errorResponse)
        };
    }
}