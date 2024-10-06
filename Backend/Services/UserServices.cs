using Backend.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.DataAccess;

namespace Backend.Services
{
    public class UserServices
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly string _jwtSecretKey;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public UserServices(SqlExecutor sqlExecutor, IConfiguration configuration, IEmailService emailService)
        {
            _sqlExecutor = sqlExecutor;
            _configuration = configuration;
            _emailService = emailService;
            _jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(_jwtSecretKey))
            {
                throw new InvalidOperationException("JWT secret key not configured in environment variables.");
            }
        }

        public bool CheckIfUserExists(string email)
        {
            return _sqlExecutor.IsUserExistInDatabase(email);
        }

        public bool CreateNewRegisteredUser(UserModel user)
        {
            return _sqlExecutor.InsertNewUserDatabase(user);
        }

        public UserModel GetUserByEmail(string email)
        {
            return _sqlExecutor.GetUserByEmailFromDatabase(email);
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

        public void SendVerificationEmail(string email, string token)
        {
            _emailService.SendVerificationEmail(email, token);
        }

        public bool UpdateUser(UserModel user)
        {
            return _sqlExecutor.UpdateUserInDatabase(user);
        }
        public string GetUserVerificationToken(string persoId)
        {
            return _sqlExecutor.GetUserVerificationToken(persoId);
        }

    }
}
