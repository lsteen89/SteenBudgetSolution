using System.Security.Claims;
using Backend.Application.Features.Support.Contact;
using Backend.Presentation.Constants;
using Backend.Presentation.Shared;
using MediatR;
using Backend.Common.Utilities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Presentation.Controllers;

[Authorize(Policy = "EmailConfirmed")]
[ApiController]
[Route("api/support/messages")]
public sealed class SupportController : ControllerBase
{
    private readonly ISender _sender;

    public SupportController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.SupportMessageSending)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Send(
        [FromBody] SendSupportMessageRequest request,
        CancellationToken ct)
    {
        var persoid = User.GetPersoid();
        if (!persoid.HasValue)
        {
            return Unauthorized(ApiEnvelope<string>.Failure(
                "Token.Invalid",
                "User identifier not found in token."
            ));
        }

        var command = new SendSupportMessageCommand(
            Persoid: persoid.Value,
            Subject: request.Subject,
            Body: request.Body,
            Category: request.Category,
            IpAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent: Request.Headers.UserAgent.ToString()
        );

        var result = await _sender.Send(command, ct);

        if (result.IsFailure)
        {
            return BadRequest(ApiEnvelope<string>.Failure(
                result.Error.Code,
                result.Error.Description
            ));
        }

        return Accepted(ApiEnvelope<string>.Success("Support message queued."));
    }
}