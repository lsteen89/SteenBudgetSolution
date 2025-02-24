using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Application.Services;
using Backend.Application.DTO;
using Backend.Application.Interfaces.UserServices;
using Backend.Common.Converters;
using System.Security.Claims;

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
        public async Task<ActionResult<UserDto>> GetCurrentUser()
        {
            _logger.LogDebug("GetCurrentUser:");
            var claims = User.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
            _logger.LogDebug("User claims: {Claims}", string.Join(", ", claims));

            // Get the email claim directly
            var userEmailClaim = User.Claims.FirstOrDefault(c => c.Type == "email");

            if (userEmailClaim == null || string.IsNullOrEmpty(userEmailClaim.Value))
            {
                return Unauthorized(); // Or return a 401
            }

            var userEmail = userEmailClaim.Value;

            // 1. Call the UserManagementService to get the user.
            var userModel = await _userService.GetUserByEmailAsync(userEmail);

            if (userModel == null)
            {
                return NotFound();
            }

            // 3. Map UserModel to UserDto.
            var userDto = ModelConverter.ToUserDto(userModel);

            return Ok(userDto);
        }
    }
}