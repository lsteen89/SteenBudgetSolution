using Backend.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.DataAccess;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Backend.Controllers;

namespace Backend.Services
{
    public class UserServices
    {
        private readonly SqlExecutor _sqlExecutor;
        private readonly string? _jwtSecretKey;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<RegistrationController> _logger;

        public UserServices(SqlExecutor sqlExecutor, IConfiguration configuration, IEmailService emailService, ILogger<RegistrationController> logger)
        {
            _sqlExecutor = sqlExecutor;
            _configuration = configuration;
            _emailService = emailService;
            _jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(_jwtSecretKey))
            {
                throw new InvalidOperationException("JWT secret key not configured in environment variables.");
            }
            _logger = logger;
        }

        public bool CheckIfUserExists(string email)
        {
            return _sqlExecutor.IsUserExistInDatabase(email);
        }

        public bool CreateNewRegisteredUser(UserModel user)
        {
            return _sqlExecutor.InsertNewUserDatabase(user);
        }

        public UserModel GetUserForRegistrationByEmail(string email)
        {
            return _sqlExecutor.GetUserForRegistration(null, email);
        }

        public UserModel? GetUserForRegistrationByPersoId(Guid persoid)
        {
            return _sqlExecutor.GetUserForRegistration(persoid, null);
        }
        public string GenerateJwtToken(UserModel user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            if (string.IsNullOrEmpty(_jwtSecretKey))
            {
                throw new InvalidOperationException("JWT secret key must not be null or empty.");
            }
            var key = Encoding.UTF8.GetBytes(_jwtSecretKey); 
            if (key.Length < 16)
            {
                throw new InvalidOperationException("JWT secret key must be at least 16 characters long.");
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("id", user.Id.ToString()),
                    new Claim("email", user.Email ?? string.Empty) // Fallback to an empty string if email is null
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };


            //Log a warning if the user does not have an email set
            if (string.IsNullOrEmpty(user.Email))
            {
                _logger.LogWarning("User with ID {Id} does not have an email set.", user.Id);
            }
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public void SendVerificationEmail(string email, string token)
        {
            _emailService.SendVerificationEmail(email, token);
        }

        public bool UpdateEmailConfirmationStatus(UserModel user)
        {
            return _sqlExecutor.UpdateEmailConfirmationStatus(user);
        }
        public string GetUserVerificationToken(string persoId)
        {
            return _sqlExecutor.GetUserVerificationToken(persoId);
        }
        public TokenModel? GetUserVerificationTokenData(string token)
        {             
            return _sqlExecutor.GetUserVerificationTokenData(token);
        }

    }
}
