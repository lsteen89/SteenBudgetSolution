using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using MediatR;
using Backend.Application.DTO.User;
using Backend.Application.Features.Users.Queries.GetUserModel;

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
        public async Task<ActionResult<UserDto>> GetMe(CancellationToken ct)
        {
            var email = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);

            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var dto = await _mediator.Send(new GetUserModelQuery(Email: email), ct);
            return dto is null ? NotFound() : Ok(dto);
        }
    }
}
