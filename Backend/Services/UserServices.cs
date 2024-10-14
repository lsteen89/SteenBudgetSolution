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
