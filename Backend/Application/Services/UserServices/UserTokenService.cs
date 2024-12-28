using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace Backend.Application.Services.UserServices
{
    public class UserTokenService : IUserTokenService
    {
        private readonly ITokenSqlExecutor _tokenSqlExecutor;
        private readonly IConfiguration _configuration;
        public UserTokenService(ITokenSqlExecutor tokenSqlExecutor, IConfiguration configuration)
        {
            _tokenSqlExecutor = tokenSqlExecutor;
            _configuration = configuration;
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
                    ClockSkew = TimeSpan.Zero 
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
            await _tokenSqlExecutor.GenerateUserTokenAsync(persoid);

        public async Task<bool> InsertUserTokenAsync(UserTokenModel tokenModel) =>
            await _tokenSqlExecutor.InsertUserTokenAsync(tokenModel);

        public async Task<UserTokenModel?> GetTokenByGuidAsync(Guid token) =>
            await _tokenSqlExecutor.GetUserVerificationTokenByTokenAsync(token);

        public async Task<bool> DeleteTokenByPersoidAsync(Guid persoid) =>
            (await _tokenSqlExecutor.DeleteUserTokenByPersoidAsync(persoid)) > 0;
        public async Task<UserVerificationTrackingModel> GetUserVerificationTrackingAsync(Guid persoId) =>
            await _tokenSqlExecutor.GetUserVerificationTrackingAsync(persoId);
        public async Task InsertUserVerificationTrackingAsync(UserVerificationTrackingModel tracking) =>
            await _tokenSqlExecutor.InsertUserVerificationTrackingAsync(tracking);
        public async Task<UserTokenModel?> GetUserVerificationTokenByPersoIdAsync(Guid persoid) =>
            await _tokenSqlExecutor.GetUserVerificationTokenByPersoIdAsync(persoid);
        public async Task<int> DeleteUserTokenByPersoidAsync(Guid persoid) =>
            await _tokenSqlExecutor.DeleteUserTokenByPersoidAsync(persoid);
        public async Task UpdateUserVerificationTrackingAsync(UserVerificationTrackingModel tracking) =>
            await _tokenSqlExecutor.UpdateUserVerificationTrackingAsync(tracking);
        public async Task SaveResetTokenAsync(Guid persoId, Guid token) =>
            await _tokenSqlExecutor.SaveResetTokenAsync(persoId, token);
        public async Task<bool> ValidateResetTokenAsync(Guid token) =>
            await _tokenSqlExecutor.ValidateResetTokenAsync(token);

    }
}
