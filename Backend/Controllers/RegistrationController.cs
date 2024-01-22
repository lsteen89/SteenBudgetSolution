using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class RegistrationController : ControllerBase
    {
        private UserServices _userServices;

        [HttpPost("register")]
        public IActionResult Register(UserModel user)
        {
            //See if user exists
            _userServices = new Services.UserServices();
            bool userExists = _userServices.CheckIfUserExists(user.Email);
            if (userExists)
            {
                return BadRequest(ModelState);
            }

            // Hash the password

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.Password);

            // Create and save the new user in the database
            // ...

            return Ok(); // Or appropriate response
        }
    }
}
