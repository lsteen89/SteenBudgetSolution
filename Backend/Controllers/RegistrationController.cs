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
        private readonly string _jwtSecretKey;

        public RegistrationController(UserServices userServices, IConfiguration configuration)
        {
            _userServices = userServices;
            _jwtSecretKey = configuration["Jwt:Key"];
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] UserCreationDto userDto)
        {
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

            // Retrieve the verification token from the database
            string verificationToken = _userServices.GetUserVerificationToken(user.PersoId);


            // Send verification email
            _userServices.SendVerificationEmail(user.Email, token);

            return Ok(new { message = "Registration successful. Please check your email for verification link." });
        }

        [HttpGet("verify-email")]
        public IActionResult VerifyEmail(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_jwtSecretKey);
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var email = jwtToken.Claims.First(x => x.Type == "email").Value;

                var user = _userServices.GetUserByEmail(email);
                if (user == null)
                    return BadRequest(new { message = "Invalid token" });

                user.IsVerified = true;
                _userServices.UpdateUser(user);

                return Ok(new { message = "Email verified successfully" });
            }
            catch
            {
                return BadRequest(new { message = "Invalid or expired token" });
            }
        }
    }
}
