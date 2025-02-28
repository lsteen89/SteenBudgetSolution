using Backend.Application.Interfaces.UserServices;
using Backend.Common.Interfaces;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;

namespace Backend.Application.Services.UserServices
{
    public class UserTokenService : IUserTokenService
    {
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly ITimeProvider _timeProvider;
        private readonly IEnvironmentService _environmentService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UserTokenService> _logger;
        public UserTokenService(IUserSQLProvider userSQLProvider, ITimeProvider timeProvider, IEnvironmentService environmentService, IHttpContextAccessor httpContextAccessor, IConfiguration configuration, ILogger<UserTokenService> logger)
        {
            _userSQLProvider = userSQLProvider;
            _timeProvider = timeProvider;
            _environmentService = environmentService;
            _httpContextAccessor = httpContextAccessor;
            _configuration = configuration;
            _logger = logger;
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
