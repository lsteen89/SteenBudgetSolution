using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using MediatR;
using Backend.Application.DTO.User;
using Backend.Application.Features.Users.Queries.GetUserModel;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Backend.Presentation.Shared;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
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
            var email =
                User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);

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
    }
}
