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
using Backend.Helpers;

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

        public async Task<bool> CheckIfUserExistsAsync(string email)
        {
            return await _sqlExecutor.IsUserExistInDatabaseAsync(email);
        }

        public async Task<bool> CreateNewRegisteredUserAsync(UserModel user)
        {
            return await _sqlExecutor.InsertNewUserDatabaseAsync(user);
        }

        public async Task<UserModel> GetUserForRegistrationByEmailAsync(string email)
        {
            return await _sqlExecutor.GetUserForRegistrationAsync(email: email);
        }

        public async Task<UserModel>? GetUserForRegistrationByPersoId(Guid persoid)
        {
            return await _sqlExecutor.GetUserForRegistrationAsync(persoid, null);
        }
        public async Task SendVerificationEmailAsync(string email, string token)
        {
            await _emailService.SendVerificationEmailAsync(email, token);
        }
        public async Task<bool> UpdateEmailConfirmationStatusAsync(UserModel user)
        {
            return await _sqlExecutor.UpdateEmailConfirmationStatusAsync(user);
        }

        public async Task<string> GetUserVerificationTokenAsync(string persoId)
        {
            return await _sqlExecutor.GetUserVerificationTokenAsync(persoId);
        }
        public async Task<TokenModel?> GetUserVerificationTokenDataAsync(string token)
        {
            return await _sqlExecutor.GetUserVerificationTokenDataAsync(token);
        }
        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email)
        {
            var userVerificationHelper = new UserVerificationHelper(_sqlExecutor, _emailService);
            return await userVerificationHelper.ResendVerificationEmailAsync(email);
        }
        public async Task<bool> DeleteUserByEmailAsync(string email)
        {
            var rowsAffected = await _sqlExecutor.DeleteUserByEmailAsync(email);
            return rowsAffected > 0; 
        }

    }
}
