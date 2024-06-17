using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.DTO;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationController : ControllerBase
    {
        private readonly UserServices _userServices;

        public RegistrationController(UserServices userServices)
        {
            _userServices = userServices;
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

            return Ok();
        }
    }
}
