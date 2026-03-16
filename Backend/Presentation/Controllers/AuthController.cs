using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Common.Utilities;
using Backend.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MediatR;
using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
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
using Backend.Application.Features.Authentication.ForgotPassword;
using Backend.Application.Features.Authentication.ResetPassword;
using Backend.Presentation.Constants; // For RateLimitPolicies

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
        [EnableRateLimiting(RateLimitPolicies.Login)]
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

        [EnableRateLimiting(RateLimitPolicies.Logout)]
        [AllowAnonymous]
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

        [EnableRateLimiting(RateLimitPolicies.Refresh)]
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
        [EnableRateLimiting(RateLimitPolicies.Registration)]
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
                dto.Locale,
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
        [Authorize(Policy = "Onboarding")]
        [EnableRateLimiting(RateLimitPolicies.VerifyEmail)]
        [HttpPost("verify-email-code")]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<AuthResult>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailCodeRequest req, CancellationToken ct)
        {
            var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
                ?? User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                return Unauthorized(ApiEnvelope<AuthResult>.Failure(
                    "Auth.InvalidToken",
                    "Missing email claim."
                ));
            }

            var (ip, ua, deviceId) = RequestMetadataHelper.ExtractMetadata(HttpContext);

            var cmd = new VerifyEmailCodeCommand(
                Email: email,
                Code: req.Code,
                DeviceId: deviceId ?? "unknown-device",
                UserAgent: ua ?? "",
                RememberMe: true
            );

            var result = await _mediator.Send(cmd, ct);

            if (result.IsFailure)
                return BadRequest(ApiEnvelope<AuthResult>.Failure(result.Error.Code, result.Error.Description));

            var issued = result.Value!;

            var refreshCookie = _cookieService.CreateRefreshCookie(issued.RefreshToken, issued.Result.RememberMe);
            Response.Cookies.Append(refreshCookie.Name, refreshCookie.Value, refreshCookie.Options);

            return Ok(ApiEnvelope<AuthResult>.Success(issued.Result));
        }

        [Authorize(Policy = "Onboarding")]
        [EnableRateLimiting(RateLimitPolicies.ResendVerification)]
        [HttpPost("resend-verification")]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ResendVerificationEmail(CancellationToken ct)
        {
            var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
                ?? User.FindFirstValue(ClaimTypes.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                return Unauthorized(ApiEnvelope<string>.Failure(
                    "Auth.InvalidToken",
                    "Missing email claim."
                ));
            }

            var command = new ResendVerificationCommand(email);
            await _mediator.Send(command, ct);

            var successEnvelope = ApiEnvelope.Success(
                "Verification.ResendAccepted",
                "If an account with that email exists, a new verification code has been sent."
            );

            return Ok(successEnvelope);
        }
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.ResendVerification)]
        [HttpPost("resend-verification-recovery")]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ResendVerificationRecovery(
        [FromBody] ResendVerificationRecoveryRequest request,
        CancellationToken ct)
        {
            var command = new ResendVerificationCommand(request.Email);
            await _mediator.Send(command, ct);

            return Ok(ApiEnvelope.Success(
                "Verification.ResendAccepted",
                "If an account with that email exists, a new verification code has been sent."
            ));
        }
        #endregion
        #region Password reset (initiate + complete)
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.ForgotPassword)]
        [HttpPost("forgot-password")]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordRequest request,
            CancellationToken ct)
        {
            await _mediator.Send(new ForgotPasswordCommand(request.Email, request.Locale), ct);

            return Ok(ApiEnvelope.Success(
                "PasswordReset.RequestAccepted",
                "If an account with that email exists, password reset instructions have been sent."
            ));
        }

        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.ResetPassword)]
        [HttpPost("reset-password")]
        [ProducesResponseType(typeof(ApiEnvelope<object?>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordRequest request,
            CancellationToken ct)
        {
            var result = await _mediator.Send(
                new ResetPasswordCommand(
                    request.Email,
                    request.Code,
                    request.NewPassword,
                    request.ConfirmPassword
                ),
                ct);

            if (result.IsFailure)
                return BadRequest(ApiEnvelope<string>.Failure(
                    result.Error.Code,
                    result.Error.Description
                ));

            return Ok(ApiEnvelope.Success(
                "PasswordReset.Completed",
                "Your password has been reset successfully."
            ));
        }
        #endregion
    }
}
