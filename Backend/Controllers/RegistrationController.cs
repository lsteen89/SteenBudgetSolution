using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.DTO;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System;
using System.Linq;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationController : ControllerBase
    {
        private readonly UserServices _userServices;
        private readonly string? _jwtSecretKey;
        private readonly ILogger<RegistrationController> _logger; 

        public RegistrationController(UserServices userServices, IConfiguration configuration, ILogger<RegistrationController> logger)
        {
            _userServices = userServices;
            _jwtSecretKey = configuration["Jwt:Key"];
            _logger = logger;
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] UserCreationDto userDto)
        {
            _logger.LogInformation("POST /api/Registration/register called");

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Model state is invalid");
                return BadRequest(ModelState);
            }

            _logger.LogInformation("Processing registration for user: {UserName}", userDto.Email);
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = new UserModel
            {
                FirstName = userDto.FirstName,
                LastName = userDto.LastName,
                Email = userDto.Email,
                Password = userDto.Password,
            };

            // Check if user exists
            bool userExists = _userServices.CheckIfUserExists(user.Email);
            if (userExists)
            {
                ModelState.AddModelError("Email", "This email is already taken.");
                return BadRequest(new { message = "This email is already taken." });
            }

            // Hash the password with BCrypt
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password);
            user.Password = hashedPassword;

            // Create new registered user
            bool isSuccessfulRegistration = _userServices.CreateNewRegisteredUser(user);
            if (!isSuccessfulRegistration)
            {
                return BadRequest("Registration failed due to an internal error. Please try again.");
            }

            string? verificationToken = _userServices.GetUserVerificationToken(user.PersoId.ToString());
            // Send verification email
            _userServices.SendVerificationEmail(user.Email, verificationToken);
            return Ok(new { message = "Registration successful. Please check your email for verification link." });
        }

        [HttpGet("verify-email")]
        public IActionResult VerifyEmail(string token)
        {
            try
            {
                // Retrieve the PersoID of the token and its expiry date from the database
                var tokenData = _userServices.GetUserVerificationTokenData(token);

                if (tokenData == null)
                {
                    return BadRequest(new { message = "Invalid token" });
                }

                // Check if the token has expired
                if (tokenData.TokenExpiryDate < DateTime.UtcNow)
                {
                    return BadRequest(new { message = "Token has expired" });
                }

                // Fetch the user associated with the token (using PersoId)
                var user = _userServices.GetUserForRegistrationByPersoId(tokenData.PersoId);

                // Mark the user as verified and update
                user!.IsVerified = true;
                _userServices.UpdateEmailConfirmationStatus(user);

                // Return success response
                return Ok(new { message = "Email verified successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification failed");
                return BadRequest(new { message = "Invalid or expired token" });
            }
        }

    }
}
