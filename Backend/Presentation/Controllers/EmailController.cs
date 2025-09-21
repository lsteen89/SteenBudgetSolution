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
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Contact([FromBody] SendContactFormRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiErrorResponse("Validation.Error", "Invalid input."));

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var ua = Request.Headers.UserAgent.ToString();

        var cmd = new SendContactFormCommand(req.Subject, req.Body, req.SenderEmail, req.CaptchaToken, ip, ua);
        var result = await _mediator.Send(cmd, ct);

        if (result.IsFailure)
        {
            if (result.Error == UserErrors.RateLimitExceeded)
                return StatusCode(429, new ApiErrorResponse(result.Error.Code, result.Error.Description));
            if (result.Error == UserErrors.InvalidCaptcha)
                return BadRequest(new ApiErrorResponse(result.Error.Code, result.Error.Description));
            return BadRequest(new ApiErrorResponse(result.Error.Code, "Failed to send message."));
        }

        return Ok(new ApiResponse<string>("Message received."));
    }
}

