using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.DTO;

namespace Backend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class RegistrationController : ControllerBase
    {
        private UserServices _userServices;

        [HttpPost("register")]
        public IActionResult Register(UserCreationDto userDto)
        {
            var user = new UserModel
            {
                FirstName = userDto.FirstName,
                LastName = userDto.LastName,
                Email = userDto.Email,
                Password = userDto.Password,
            };
            //First check if the fields entered are valid
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            //See if user exists
            _userServices = new Services.UserServices();
            bool userExists = _userServices.CheckIfUserExists(user.Email);
            if (userExists)
            {
                ModelState.AddModelError("Email", "This email is already taken.");
                return BadRequest(new { message = "This email is already taken." });
            }

            //Hash the PW with BCrypt, which also salts it and keeps the salt in the string
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password);
            user.Password = hashedPassword;
            bool isSuccessfulRegistration = _userServices.CreateNewRegisteredUser(user);
            if (!isSuccessfulRegistration)
            {
                return BadRequest("Registration failed due to an internal error. Please try again.");
            }
            return Ok(); 
        }
    }
}
