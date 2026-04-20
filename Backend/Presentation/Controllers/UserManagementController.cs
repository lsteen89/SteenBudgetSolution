using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using MediatR;
using Backend.Application.DTO.User;
using Backend.Application.Features.Users.Queries.GetUserModel;
using Backend.Presentation.Shared;
using Backend.Application.Features.Users.GetUserPreferences.Queries;
using Backend.Application.DTO.User.Models;
using Backend.Common.Utilities;
using Backend.Application.DTO.Budget.Income;
using Backend.Application.Features.Budgets.Income.UpdateSalaryPaymentTiming;
using Backend.Application.Features.Users.UpdateUserPreferences.Commands;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "AccessAuthenticated")]
    public sealed class UserManagementController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(IMediator mediator, ILogger<UserManagementController> logger)
        {
            _mediator = mediator;
            _logger = logger;
        }


        [HttpGet("me")]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiEnvelope<UserDto>>> GetMe(CancellationToken ct)
        {
            var email = ClaimsPrincipalExtensions.GetEmail(User);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<UserDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var dto = await _mediator.Send(new GetUserModelQuery(Email: email), ct);

            if (dto is null)
            {
                var env = ApiEnvelope<UserDto>.Failure(
                    "User.NotFound",
                    "User not found."
                );
                return NotFound(env);
            }

            var successEnv = ApiEnvelope<UserDto>.Success(dto);
            return Ok(successEnv);
        }
        #region User Preferences
        [HttpGet("preferences")]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiEnvelope<UserPreferencesDto>>> GetPreferences(CancellationToken ct)
        {
            var email = User.FindFirstValue("email") ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<UserPreferencesDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var dto = await _mediator.Send(new GetUserPreferencesQuery(email), ct);

            if (dto is null)
            {
                var env = ApiEnvelope<UserPreferencesDto>.Failure(
                    "UserPreferences.NotFound",
                    "User preferences not found."
                );
                return NotFound(env);
            }

            return Ok(ApiEnvelope<UserPreferencesDto>.Success(dto));
        }
        [HttpPut("preferences")]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiEnvelope<UserPreferencesDto>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiEnvelope<UserPreferencesDto>>> UpdatePreferences(
        [FromBody] UpdateUserPreferencesDto request,
        CancellationToken ct)
        {
            var email = ClaimsPrincipalExtensions.GetEmail(User);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<UserPreferencesDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var result = await _mediator.Send(
                new UpdateUserPreferencesCommand(email, request.Locale, request.Currency),
                ct);

            if (result.IsFailure)
            {
                var env = ApiEnvelope<UserPreferencesDto>.Failure(result.Error.Code, result.Error.Message);
                return BadRequest(env);
            }

            return Ok(ApiEnvelope<UserPreferencesDto>.Success(result.Value!));
        }
        [HttpPut("salary-payment-timing")]
        [ProducesResponseType(typeof(ApiEnvelope<SalaryPaymentTimingDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<SalaryPaymentTimingDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiEnvelope<SalaryPaymentTimingDto>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiEnvelope<SalaryPaymentTimingDto>>> UpdateSalaryPaymentTiming(
        [FromBody] UpdateSalaryPaymentTimingRequestDto request,
        CancellationToken ct)
        {
            var email = ClaimsPrincipalExtensions.GetEmail(User);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<SalaryPaymentTimingDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var result = await _mediator.Send(
                new UpdateSalaryPaymentTimingCommand(email, request),
                ct);

            if (result.IsFailure)
            {
                var env = ApiEnvelope<SalaryPaymentTimingDto>.Failure(
                    result.Error!.Code,
                    result.Error.Message);
                return BadRequest(env);
            }

            return Ok(ApiEnvelope<SalaryPaymentTimingDto>.Success(result.Value!));
        }
        [HttpPut("profile")]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiEnvelope<UserDto>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiEnvelope<UserDto>>> UpdateProfile(
        [FromBody] UpdateUserProfileDto request,
        CancellationToken ct)
        {
            var email = ClaimsPrincipalExtensions.GetEmail(User);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<UserDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var result = await _mediator.Send(
                new UpdateUserProfileCommand(email, request.FirstName, request.LastName),
                ct);

            if (result.IsFailure)
            {
                var env = ApiEnvelope<UserDto>.Failure(result.Error.Code, result.Error.Message);
                return BadRequest(env);
            }

            return Ok(ApiEnvelope<UserDto>.Success(result.Value!));
        }
        [HttpPut("password")]
        [ProducesResponseType(typeof(ApiEnvelope<UpdatePasswordResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiEnvelope<UpdatePasswordResultDto>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiEnvelope<UpdatePasswordResultDto>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ApiEnvelope<UpdatePasswordResultDto>>> UpdatePassword(
        [FromBody] UpdateUserPasswordDto request,
        CancellationToken ct)
        {
            var email = ClaimsPrincipalExtensions.GetEmail(User);

            if (string.IsNullOrWhiteSpace(email))
            {
                var env = ApiEnvelope<UpdatePasswordResultDto>.Failure(
                    "Auth.EmailMissing",
                    "No email claim found in token."
                );
                return Unauthorized(env);
            }

            var result = await _mediator.Send(
                new UpdateUserPasswordCommand(email, request.CurrentPassword, request.NewPassword),
                ct);

            if (result.IsFailure)
            {
                var env = ApiEnvelope<UpdatePasswordResultDto>.Failure(result.Error.Code, result.Error.Message);
                return BadRequest(env);
            }

            return Ok(ApiEnvelope<UpdatePasswordResultDto>.Success(new UpdatePasswordResultDto
            {
                Updated = true
            }));
        }
        #endregion
    }
}
