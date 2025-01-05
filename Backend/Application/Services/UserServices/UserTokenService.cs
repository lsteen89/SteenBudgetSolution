using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Backend.Infrastructure.Interfaces;

namespace Backend.Application.Services.UserServices
{
    public class UserTokenService : IUserTokenService
    {
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly ITimeProvider _timeProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UserTokenService> _logger;
        public UserTokenService(IUserSQLProvider userSQLProvider, ITimeProvider timeProvider, IConfiguration configuration, ILogger<UserTokenService> logger)
        {
            _userSQLProvider = userSQLProvider;
            _timeProvider = timeProvider;
            _configuration = configuration;
            _logger = logger;
        }
        public async Task<bool> IsAuthorizedAsync(string token)
        {
            if (string.IsNullOrEmpty(token))
                return false;

            try
            {
                var handler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_configuration["JWT_SECRET_KEY"]);

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = "eBudget",
                    ValidAudience = "eBudget",
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ClockSkew = TimeSpan.Zero,
                    RequireExpirationTime = true,
                };

                // Override the current time with the mocked time from ITimeProvider
                validationParameters.LifetimeValidator = (notBefore, expires, securityToken, validationParameters) =>
                {
                    var currentTime = _timeProvider.UtcNow;
                    return notBefore <= currentTime && expires >= currentTime;
                };

                handler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
                return true; // Token is valid
            }
            catch (Exception)
            {
                return false; // Token is invalid
            }
        }


        public async Task<UserTokenModel> CreateEmailTokenAsync(Guid persoid) =>
            await _userSQLProvider.TokenSqlExecutor.GenerateUserTokenAsync(persoid);

        public async Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel) =>
            await _userSQLProvider.TokenSqlExecutor.InsertUserTokenAsync(tokenModel);

        public async Task<UserTokenModel?> GetTokenByGuidAsync(Guid token) =>
            await _userSQLProvider.TokenSqlExecutor.GetUserVerificationTokenByTokenAsync(token);

        public async Task<bool> DeleteTokenByPersoidAsync(Guid persoid) =>
            (await _userSQLProvider.TokenSqlExecutor.DeleteUserTokenByPersoidAsync(persoid)) > 0;
        public async Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId) =>
            await _userSQLProvider.TokenSqlExecutor.GetUserVerificationTrackingAsync(persoId);
        public async Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking) =>
            await _userSQLProvider.TokenSqlExecutor.InsertUserVerificationTrackingAsync(tracking);
        public async Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid) =>
            await _userSQLProvider.TokenSqlExecutor.GetUserVerificationTokenByPersoIdAsync(persoid);
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid) =>
            await _userSQLProvider.TokenSqlExecutor.DeleteUserTokenByPersoidAsync(persoid);
        public async Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking) =>
            await _userSQLProvider.TokenSqlExecutor.UpdateUserVerificationTrackingAsync(tracking);
        public async Task SaveResetTokenAsync(Guid persoId, Guid token) =>
            await _userSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(persoId, token);
        public async Task<bool> ValidateResetTokenAsync(Guid token) =>
            await _userSQLProvider.TokenSqlExecutor.ValidateResetTokenAsync(token);

    }
}
