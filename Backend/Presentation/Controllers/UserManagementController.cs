using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Services;
using Backend.Application.Interfaces.UserServices;
using Backend.Common.Converters;
using System.Security.Claims;
using Backend.Application.DTO.User;
using System.Xml.Serialization;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Presentation.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UserManagementController : ControllerBase
    {
        private readonly IUserManagementService _userService;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(IUserManagementService userService, ILogger<UserManagementController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserDto>> GetCurrentUser(CancellationToken ct)
        {
            _logger.LogDebug("GetCurrentUser");

            var email = User.FindFirstValue(ClaimTypes.Email)     
                       ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _userService.GetUserByEmailAsync(email);
            if (user is null) return NotFound();

            return Ok(ModelConverter.ToUserDto(user));
        }
    }
}