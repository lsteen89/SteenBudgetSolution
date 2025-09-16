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
        [ProducesResponseType(typeof(ApiResponse<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] UserLoginDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                // For model state errors, it's better to return a structured error response.
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new ApiErrorResponse("Validation.Error", string.Join(" ", errors)));
            }

            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            var command = new LoginCommand(dto.Email, dto.Password, dto.CaptchaToken, dto.RememberMe, ip, deviceId, ua);

            // 1. The variable from MediatR is now a 'Result' object
            var result = await _mediator.Send(command, ct);

            // 2. Check for failure using the 'IsFailure' property
            if (result.IsFailure)
            {
                return Unauthorized(new ApiErrorResponse(result.Error.Code, result.Error.Description));
            }

            // 3. The successful payload is now in the 'Value' property
            var authResultPayload = result.Value;

            if (authResultPayload is null)
            {
                // This is an unexpected state. The login process succeeded but returned
                // no data. This points to a server-side logic error.
                var error = new Error("Auth.NullPayload", "An unexpected error occurred during login.", ErrorType.Validation);
                return Result.Failure(error).ToApiResponse(); // Reuse our pattern for a 500-level error
            }

            // Now the compiler knows authResultPayload is not null and the warning is gone.
            var refreshCookie = _cookieService.CreateRefreshCookie(
                authResultPayload.RefreshToken,
                authResultPayload.RememberMe
            );
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return Ok(new ApiResponse<AuthResult>(authResultPayload));
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
        [ProducesResponseType(typeof(ApiResponse<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
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
                return Unauthorized(new ApiErrorResponse(result.Error.Code, result.Error.Description));
            }

            // On success, the payload is in result.Value
            var authResultPayload = result.Value;

            // The handler gives us the new refresh token, the controller sets the cookie
            // 4. Set the cookie using data from the payload
            if (authResultPayload is null)
            {
                // This is an unexpected server error. Refresh succeeded but returned no data.
                var error = new Error("Auth.NullPayload", "An unexpected error occurred during token refresh.", ErrorType.Validation);
                return Result.Failure(error).ToApiResponse();
            }

            // The compiler now knows authResultPayload is not null here.
            var refreshCookie = _cookieService.CreateRefreshCookie(
                authResultPayload.RefreshToken,
                authResultPayload.RememberMe
            );
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return Ok(new ApiResponse<AuthResult>(authResultPayload));
        }
        [Obsolete("This endpoint is deprecated and will be removed in future versions. Use /authz/healthz instead. Not refactored yet because a small investigation is needed to see if it is used anywhere.")]
        [AllowAnonymous] // No authentication required for health check
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new ApiResponse<string>("All good!"));
        }
        [HttpPost("register")]
        [EnableRateLimiting("RegistrationPolicy")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] UserCreationDto userCreationDto, CancellationToken ct)
        {
            // Validate the model state first
            // This ensures we catch any validation errors before processing the command
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new ApiErrorResponse("Validation.Error", string.Join(" ", errors)));
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
                    // The handler provides the specific error
                    return BadRequest(new ApiErrorResponse(result.Error.Code, result.Error.Description));
                }

                // On success, return a 201 Created status code with a helpful message
                var successMessage = "Registration successful. Please check your email to verify your account.";
                return CreatedAtAction(nameof(Login), new ApiResponse<string>(successMessage));
            }
        }
        #endregion

        #region verify email
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] Guid token)
        {
            if (token == Guid.Empty)
            {
                return BadRequest(new ApiResponse<string>("Token cannot be empty."));
            }

            var command = new VerifyEmailCommand(token);
            Result result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                // The handler will provide the correct error.
                // We can map specific error codes to status codes here if needed.
                // For example, if the token doesn't exist, we might return 404.
                if (result.Error == UserErrors.VerificationTokenNotFound)
                {
                    return NotFound(new ApiErrorResponse(result.Error.Code, result.Error.Description));
                }

                // For other failures (expired, already verified), 400 is appropriate.
                return BadRequest(new ApiErrorResponse(result.Error.Code, result.Error.Description));
            }

            return Ok(new ApiResponse<string>("Email successfully verified."));
        }

        [HttpPost("resend-verification")]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new ApiErrorResponse("Validation.Error", "Email is required."));
            }

            var command = new ResendVerificationCommand(request.Email);
            var result = await _mediator.Send(command);

            if (result.IsFailure)
            {
                // The handler provides the specific error (changed to 400 for all cases to avoid user enumeration)
                return BadRequest(new ApiErrorResponse(result.Error.Code, result.Error.Description));
            }

            // Always return a generic success message to prevent user enumeration.
            return Ok(new ApiResponse<string>("If an account with that email exists, a new verification link has been sent."));
        }
        #endregion
    }
}
