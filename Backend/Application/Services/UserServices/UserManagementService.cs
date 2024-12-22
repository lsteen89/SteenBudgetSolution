using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;

namespace Backend.Application.Services.UserServices
{
    public class UserManagementService : IUserManagementService
    {
        private readonly IUserSqlExecutor _userSqlExecutor;
        private readonly ILogger<UserManagementService> _logger;

        public UserManagementService(IUserSqlExecutor userSqlExecutor, ILogger<UserManagementService> logger)
        {
            _userSqlExecutor = userSqlExecutor;
            _logger = logger;
        }

        public async Task<bool> CheckIfUserExistsAsync(string email) =>
            await _userSqlExecutor.IsUserExistInDatabaseAsync(email);

        public async Task<bool> CreateUserAsync(UserModel user) =>
            await _userSqlExecutor.InsertNewUserDatabaseAsync(user);

        public async Task<UserModel?> GetUserByEmailAsync(string email) =>
            await _userSqlExecutor.GetUserModelAsync(email: email);

        public async Task<bool> UpdateEmailConfirmationAsync(Guid persoid) =>
            await _userSqlExecutor.UpdateEmailConfirmationStatusAsync(persoid);
    }

}
