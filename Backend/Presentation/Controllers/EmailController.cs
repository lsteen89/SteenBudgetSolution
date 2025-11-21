using MediatR;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Features.Contact;
using Backend.Presentation.Shared;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Application.DTO.Email;
using Backend.Domain.Users;

[ApiController]
[Route("api/email")]
public sealed class EmailController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<EmailController> _logger;

    public EmailController(IMediator mediator, ILogger<EmailController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpPost("contact")]
    [EnableRateLimiting("EmailSendingPolicy")] // IP/global bucket
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Contact([FromBody] SendContactFormRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage);

            var envelope = ApiEnvelope<string>.Failure(
                "Validation.Error",
                string.Join(" ", errors)
            );

            return BadRequest(envelope);
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var ua = Request.Headers.UserAgent.ToString();

        var cmd = new SendContactFormCommand(req.Subject, req.Body, req.SenderEmail, req.CaptchaToken, ip, ua);
        var result = await _mediator.Send(cmd, ct);

        if (result.IsFailure)
        {
            if (result.Error == UserErrors.RateLimitExceeded)
            {
                var env = ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description);
                return StatusCode(StatusCodes.Status429TooManyRequests, env);
            }

            if (result.Error == UserErrors.InvalidCaptcha)
            {
                var env = ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description);
                return BadRequest(env);
            }

            var fallbackEnv = ApiEnvelope<string>.Failure(
                result.Error.Code,
                "Failed to send message."
            );
            return BadRequest(fallbackEnv);
        }

        var successEnv = ApiEnvelope<string>.Success("Message received.");
        return Ok(successEnv);
    }
}

