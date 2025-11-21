using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Common.Utilities;
using Backend.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
// Mediator
using Backend.Application.Features.Commands.Auth.RefreshToken;
using Backend.Application.Features.Commands.Auth.Logout;
using Backend.Application.DTO.Email;
using Backend.Application.Features.Commands.Auth.Register;
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Features.Commands.Auth.ResendVerification;

using Backend.Presentation.Shared; // For ApiResponse
using Backend.Domain.Shared;      // For Result
using Backend.Domain.Users;       // For UserErrors
using Backend.Application.Features.Commands.Auth.VerifyEmail;


using Backend.Domain.Enums; // For ErrorType


namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ICookieService _cookieService;
        private readonly IMediator _mediator;

        public AuthController(ICookieService cookieService, IMediator mediator)
        {
            _cookieService = cookieService;
            _mediator = mediator;
        }
        #region Login, Register, Logout, Refresh

        [HttpPost("login")]
        [EnableRateLimiting("LoginPolicy")]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] UserLoginDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                var message = string.Join(" ", errors);
                var envelope = ApiEnvelope<AuthResult>.Failure("Validation.Error", message);
                return BadRequest(envelope);
            }

            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            var command = new LoginCommand(dto.Email, dto.Password, dto.CaptchaToken, dto.RememberMe, ip, deviceId, ua);

            // 1. The variable from MediatR is now a 'Result' object
            var result = await _mediator.Send(command, ct);

            // 2. Check for failure using the 'IsFailure' property
            if (result.IsFailure)
            {
                var envelope = ApiEnvelope<AuthResult>.Failure(result.Error.Code, result.Error.Description);
                return Unauthorized(envelope);
            }

            // 3. The successful payload is now in the 'Value' property
            var authResultPayload = result.Value;

            if (authResultPayload is null)
            {
                var error = new Error("Auth.NullPayload", "An unexpected error occurred during login.", ErrorType.Validation);
                var failureEnvelope = ApiEnvelope<AuthResult>.Failure(error.Code, error.Description);
                // You can choose 500 or 400 here; 500 is more honest.
                return StatusCode(StatusCodes.Status500InternalServerError, failureEnvelope);
            }

            // Now the compiler knows authResultPayload is not null and the warning is gone.
            var refreshCookie = _cookieService.CreateRefreshCookie(
                authResultPayload.RefreshToken,
                authResultPayload.RememberMe
            );
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            var successEnvelope = ApiEnvelope<AuthResult>.Success(authResultPayload);
            return Ok(successEnvelope);
        }
        [Authorize(AuthenticationSchemes = "RefreshScheme")]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromQuery] bool logoutAll = false, CancellationToken ct = default)
        {
            var req = HttpContext.Map(); // AccessToken, RefreshToken (cookie), SessionId
            var (_, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            await _mediator.Send(new LogoutCommand(
                req.AccessToken, req.RefreshToken, req.SessionId, logoutAll, ua, deviceId), ct);

            // Clear the refresh token cookie
            // The cookie service handles the cookie creation and options
            var deleteCookie = _cookieService.CreateDeleteCookie();
            Response.Cookies.Append(deleteCookie.Name, deleteCookie.Value, deleteCookie.Options);

            return NoContent();
        }

        [Authorize(AuthenticationSchemes = "RefreshScheme")]
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Refresh(CancellationToken ct)
        {
            var req = HttpContext.Map(); // AccessToken, RefreshToken (cookie), SessionId
            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            var command = new RefreshTokensCommand(req.AccessToken, req.RefreshToken, req.SessionId, ua, deviceId);

            // The result from MediatR is now our standard Result<T> object
            var result = await _mediator.Send(command, ct);

            // Check for failure
            if (result.IsFailure)
            {
                var envelope = ApiEnvelope<AuthResult>.Failure(result.Error.Code, result.Error.Description);
                return Unauthorized(envelope);
            }

            // On success, the payload is in result.Value
            var authResultPayload = result.Value;

            // The handler gives us the new refresh token, the controller sets the cookie
            // 4. Set the cookie using data from the payload
            if (authResultPayload is null)
            {
                var error = new Error("Auth.NullPayload", "An unexpected error occurred during token refresh.", ErrorType.Validation);
                var failureEnvelope = ApiEnvelope<AuthResult>.Failure(error.Code, error.Description);
                return StatusCode(StatusCodes.Status500InternalServerError, failureEnvelope);
            }

            // The compiler now knows authResultPayload is not null here.
            var refreshCookie = _cookieService.CreateRefreshCookie(
                authResultPayload.RefreshToken,
                authResultPayload.RememberMe
            );
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            var successEnvelope = ApiEnvelope<AuthResult>.Success(authResultPayload);
            return Ok(successEnvelope);
        }
        [Obsolete("This endpoint is deprecated and will be removed in future versions. Use /authz/healthz instead. Not refactored yet because a small investigation is needed to see if it is used anywhere.")]
        [AllowAnonymous] // No authentication required for health check
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(ApiEnvelope<string>.Success("All good!"));
        }
        [HttpPost("register")]
        [EnableRateLimiting("RegistrationPolicy")]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] UserCreationDto userCreationDto, CancellationToken ct)
        {
            // Validate the model state first
            // This ensures we catch any validation errors before processing the command
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    var message = string.Join(" ", errors);
                    var envelope = ApiEnvelope<string>.Failure("Validation.Error", message);
                    return BadRequest(envelope);
                }

                var command = new RegisterUserCommand(
                    userCreationDto.FirstName,
                    userCreationDto.LastName,
                    userCreationDto.Email,
                    userCreationDto.Password,
                    userCreationDto.CaptchaToken,
                    userCreationDto.Honeypot
                );

                var result = await _mediator.Send(command);

                if (result.IsFailure)
                {
                    var envelope = ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description);
                    return BadRequest(envelope);
                }

                var successMessage = "Registration successful. Please check your email to verify your account.";
                var successEnvelope = ApiEnvelope<string>.Success(successMessage);

                return CreatedAtAction(nameof(Login), successEnvelope);
            }
        }
        #endregion

        #region verify email
        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] Guid token)
        {
            if (token == Guid.Empty)
            {
                var envelope = ApiEnvelope<string>.Failure(
                    "Verification.Token.Invalid",
                    "Verification token is invalid."
                );
                return BadRequest(envelope);
            }

            var command = new VerifyEmailCommand(token);
            Result result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                var envelope = ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description);

                if (result.Error == UserErrors.VerificationTokenNotFound)
                {
                    return NotFound(envelope);
                }

                return BadRequest(envelope);
            }

            var successEnvelope = ApiEnvelope<string>.Success("Email successfully verified.");
            return Ok(successEnvelope);
        }

        [HttpPost("resend-verification")]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                var envelope = ApiEnvelope<string>.Failure("Validation.Error", "Email is required.");
                return BadRequest(envelope);
            }

            var command = new ResendVerificationCommand(request.Email);
            var result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                var envelope = ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description);
                return BadRequest(envelope);
            }

            var successEnvelope = ApiEnvelope<string>.Success(
                "If an account with that email exists, a new verification link has been sent."
            );

            return Ok(successEnvelope);
        }
        #endregion
    }
}
