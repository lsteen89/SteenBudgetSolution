using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        [HttpPost("login")]
        public IActionResult Login(LoginModel loginModel)
        {
            /*
            // Validate credentials
            // If valid:
            var token = GenerateJwtToken(loginModel.Username);
            return Ok(new { token = token });

            // If invalid:
            // return Unauthorized();
        
            */

            return Ok(new { message = "Login API called successfully!" });

            
        }
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "Test API (GET) called successfully!" });
        }

        private string GenerateJwtToken(string username)
        {
            // Implement JWT token generation logic
            return null;
        }
    }

}
