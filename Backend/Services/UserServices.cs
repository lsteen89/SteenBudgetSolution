using Backend.DataAccess;
using Backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Services
{
    public class UserServices
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly string _jwtSecretKey;

        public UserServices(SqlExecutor sqlExecutor, IConfiguration configuration)
        {
            _sqlExecutor = sqlExecutor;
            _jwtSecretKey = configuration["JwtSecretKey"];
        }

        public bool CheckIfUserExists(string email)
        {
            return _sqlExecutor.IsUserExistInDatabase(email);
        }

        public bool CreateNewRegisteredUser(UserModel user)
        {
            return _sqlExecutor.InsertNewUserDatabase(user);
        }
        public string GenerateJwtToken(UserModel user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSecretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                new Claim("id", user.Id.ToString()),
                new Claim("email", user.Email)
            }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
