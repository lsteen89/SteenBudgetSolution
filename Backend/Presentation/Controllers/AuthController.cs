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
using Backend.Application.Features.Authentication.RefreshToken;
using Backend.Application.Features.Commands.Auth.Logout;
using Backend.Application.DTO.Email;
using Backend.Application.Features.Authentication.Login;
using Backend.Application.Features.Authentication.Register.ResendVerificationMail;
using Backend.Application.Features.VerifyEmail;

using Backend.Presentation.Shared; // For ApiResponse
using Backend.Domain.Shared;      // For Result
using Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;
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
            var (remoteIp, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);
            var command = new LoginCommand(dto.Email, dto.Password, dto.HumanToken, dto.RememberMe, remoteIp, deviceId, ua);

            var result = await _mediator.Send(command, ct);

            if (result.IsFailure)
                return Unauthorized(ApiEnvelope<AuthResult>.Failure(result.Error.Code, result.Error.Description));

            var issued = result.Value!;
            var refreshCookie = _cookieService.CreateRefreshCookie(issued.RefreshToken, issued.Result.RememberMe);
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return Ok(ApiEnvelope<AuthResult>.Success(issued.Result));

        }

        [EnableRateLimiting("LogoutPolicy")]
        [Authorize(AuthenticationSchemes = "AccessScheme")]
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

        [EnableRateLimiting("RefreshPolicy")]
        [AllowAnonymous]
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Refresh(CancellationToken ct)
        {
            var req = HttpContext.MapRefresh();
            var (_, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            var cmd = new RefreshTokensCommand(
                AccessToken: req.AccessToken,
                RefreshCookie: req.RefreshCookie ?? "",
                UserAgent: ua ?? "",
                DeviceId: deviceId ?? "unknown-device"
            );

            var result = await _mediator.Send(cmd, ct);

            if (result.IsFailure)
                return Unauthorized(ApiEnvelope<AuthResult>.Failure(result.Error.Code, result.Error.Description));

            var issued = result.Value!; // IssuedAuthSession

            var refreshCookie = _cookieService.CreateRefreshCookie(
                issued.RefreshToken,
                issued.Result.RememberMe
            );

            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return Ok(ApiEnvelope<AuthResult>.Success(issued.Result));
        }
        [HttpPost("register")]
        [EnableRateLimiting("RegistrationPolicy")]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult?>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult?>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] UserCreationDto dto, CancellationToken ct)
        {
            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            var result = await _mediator.Send(new RegisterAndIssueSessionCommand(
                dto.FirstName,
                dto.LastName,
                dto.Email,
                dto.Password,
                dto.HumanToken,
                dto.Honeypot ?? "",
                RemoteIp: ip,
                DeviceId: deviceId,
                UserAgent: ua
            ), ct);

            if (result.IsFailure)
                return BadRequest(ApiEnvelope<AuthResult?>.Failure(result.Error.Code, result.Error.Description));

            var issued = result.Value;

            if (issued is null)
                return StatusCode(201, ApiEnvelope<AuthResult?>.Success(null));

            var refreshCookie = _cookieService.CreateRefreshCookie(issued.RefreshToken, issued.Result.RememberMe);
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return StatusCode(201, ApiEnvelope<AuthResult?>.Success(issued.Result));
        }
        #endregion

        #region verify email
        [AllowAnonymous]
        [EnableRateLimiting("VerifyEmailPolicy")]
        [HttpPost("verify-email-code")]
        public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailCodeRequest req, CancellationToken ct)
        {
            var cmd = new VerifyEmailCodeCommand(req.Email, req.Code);
            var result = await _mediator.Send(cmd, ct);

            return result.IsSuccess
                ? Ok(ApiEnvelope<string>.Success("OK"))
                : BadRequest(ApiEnvelope<string>.Failure(result.Error.Code, result.Error.Description));
        }

        [AllowAnonymous]
        [EnableRateLimiting("ResendVerificationPolicy")]
        [HttpPost("resend-verification")]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request)
        {
            var command = new ResendVerificationCommand(request.Email);
            var result = await _mediator.Send(command);

            var successEnvelope = ApiEnvelope<string>.Success(
                "If an account with that email exists, a new verification code has been sent."
            );

            return Ok(successEnvelope);
        }
        #endregion
    }
}
