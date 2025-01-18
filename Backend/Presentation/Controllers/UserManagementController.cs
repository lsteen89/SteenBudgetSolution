using Backend.Application.DTO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Application.Interfaces.UserServices;
namespace Backend.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserManagementController : ControllerBase
    {
        private readonly IUserAuthenticationService _userAuthenticationService;
        public UserManagementController(IUserAuthenticationService userAuthenticationService)
        {
            _userAuthenticationService = userAuthenticationService;
        }
        [HttpPost("generate-reset-password-email")]
        [EnableRateLimiting("EmailSendingPolicy")]
        public async Task<IActionResult> ResetPassword([FromBody] Backend.Application.DTO.ResetPasswordRequest request)
        {
            var emailSent = await _userAuthenticationService.SendResetPasswordEmailAsync(request.Email);

            if (emailSent)
            {
                return Ok(new { message = "Om den angivna e-postadressen är registrerad har ett återställningsmail skickats." });
            }

            return StatusCode(500, new { message = "Ett fel inträffade, vänligen försök igen eller kontakta support!" });
        }

        [HttpPost("reset-password-with-token")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPassword request)
        {
            var result = await _userAuthenticationService.UpdatePasswordAsync(request.Token, request.Password);

            if (result.Success)
            {
                return Ok(new { message = result.Message });
            }
            else
            {
                return StatusCode(result.StatusCode ?? 400, new { message = result.Message });
            }
        }
    }
}
