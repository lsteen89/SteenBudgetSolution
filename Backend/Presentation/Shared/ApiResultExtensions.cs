using Backend.Domain.Enums;
using Backend.Domain.Shared;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Presentation.Shared;

public static class ApiResultExtensions
{
    public static ActionResult<ApiEnvelope<TValue>> ToApiEnvelope<TValue>(this Result<TValue> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(ApiEnvelope<TValue>.Success(result.Value!));
        }

        var envelope = ApiEnvelope<TValue>.Failure(result.Error.Code, result.Error.Description);

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

        var envelope = ApiEnvelope<object?>.Failure(result.Error.Code, result.Error.Description);

        return result.Error.Type switch
        {
            ErrorType.NotFound => new NotFoundObjectResult(envelope),
            ErrorType.Conflict => new ConflictObjectResult(envelope),
            ErrorType.Unauthorized => new UnauthorizedObjectResult(envelope),
            _ => new BadRequestObjectResult(envelope)
        };
    }
}
