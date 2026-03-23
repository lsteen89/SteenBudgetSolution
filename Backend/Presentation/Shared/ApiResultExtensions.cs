using Backend.Domain.Shared;
using Backend.Domain.Common.Constants;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Shared;

public static class ApiResultExtensions
{
    public static ActionResult<ApiEnvelope<TValue>> ToApiEnvelope<TValue>(this Result<TValue> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(ApiEnvelope.Success(result.Value!));
        }

        var envelope = ApiEnvelope.Failure<TValue>(result.Error.Code, result.Error.Description);

        return result.Error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(envelope),
            ErrorType.Conflict => new ConflictObjectResult(envelope),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(envelope),
            _ => new BadRequestObjectResult(envelope)
        };
    }

    public static ActionResult ToApiEnvelope(this Result result)
    {
        if (result.IsSuccess)
        {
            // For commands with no body we keep 204 No Content.
            return new NoContentResult();
        }

        var envelope = ApiEnvelope.Failure<object?>(result.Error.Code, result.Error.Description);

        return result.Error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(envelope),
            ErrorType.Conflict => new ConflictObjectResult(envelope),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(envelope),
            _ => new BadRequestObjectResult(envelope)
        };
    }
}
