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
            _logger.LogInformation("POST /api/Registration/register called for email: {Email}", userDto.Email);
            _logger.LogInformation("test log {Email}", userDto.Email);
            // Check if model state is valid
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for email: {Email}", userDto.Email);
                return BadRequest(ModelState);
            }

            _logger.LogInformation("Processing registration for user: {Email}", userDto.Email);

            try
            {
                // Check if user exists
                bool userExists = _userServices.CheckIfUserExists(userDto.Email);
                if (userExists)
                {
                    _logger.LogWarning("Registration attempt with already taken email: {Email}", userDto.Email);
                    ModelState.AddModelError("Email", "This email is already taken.");
                    return BadRequest(new { message = "This email is already taken." });
                }

                // Hash the password with BCrypt
                _logger.LogInformation("Hashing password for user: {Email}", userDto.Email);
                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(userDto.Password);

                var user = new UserModel
                {
                    FirstName = userDto.FirstName,
                    LastName = userDto.LastName,
                    Email = userDto.Email,
                    Password = hashedPassword,
                };

                // Create new registered user
                _logger.LogInformation("Creating new registered user for email: {Email}", userDto.Email);
                bool isSuccessfulRegistration = _userServices.CreateNewRegisteredUser(user);
                if (!isSuccessfulRegistration)
                {
                    _logger.LogError("Failed to register user for email: {Email}", userDto.Email);
                    return BadRequest("Registration failed due to an internal error. Please try again.");
                }

                // Retrieve verification token and send verification email
                _logger.LogInformation("Generating verification token for user: {Email}", userDto.Email);
                string? verificationToken = _userServices.GetUserVerificationToken(user.PersoId.ToString());

                _logger.LogInformation("Sending verification email to: {Email}", userDto.Email);
                if (_userServices == null)
                {
                    _logger.LogError("_userServices is null. Unable to send verification email.");
                    throw new InvalidOperationException("_userServices is not properly injected.");
                }
                try
                {
                    _logger.LogInformation("Calling SendVerificationEmail for {Email}", userDto.Email);
                    _logger.LogInformation("Checking _userServices: {UserServiceIsNull}", _userServices == null);
                    _userServices!.SendVerificationEmail(user.Email, verificationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send verification email for {Email}", userDto.Email);
                    throw; // Optional rethrow for further handling
                }

                _logger.LogInformation("Registration successful for user: {Email}", userDto.Email);
                return Ok(new { message = "Registration successful. Please check your email for verification link." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing registration for email: {Email}", userDto.Email);
                return StatusCode(500, "An error occurred while processing your request.");
            }
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
