using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;

namespace Backend.Application.Services.UserServices
{
    public class UserManagementService : IUserManagementService
    {
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly ILogger<UserManagementService> _logger;

        public UserManagementService(IUserSQLProvider userSQLProvider, ILogger<UserManagementService> logger)
        {
            _userSQLProvider = userSQLProvider;
            _logger = logger;
        }

        public async Task<bool> CheckIfUserExistsAsync(string email) =>
            await _userSQLProvider.UserSqlExecutor.IsUserExistInDatabaseAsync(email);

        public async Task<bool> CreateUserAsync(UserModel user) =>
            await _userSQLProvider.UserSqlExecutor.InsertNewUserDatabaseAsync(user);

        public async Task<UserModel?> GetUserByEmailAsync(string email) =>
            await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email);

        public async Task<int> UpdateEmailConfirmationAsync(Guid persoid) => 
            await _userSQLProvider.UserSqlExecutor.UpdateEmailConfirmationAsync(persoid);
        public async Task<bool> IsEmailAlreadyConfirmedAsync(Guid persoid) =>
            await _userSQLProvider.UserSqlExecutor.IsEmailAlreadyConfirmedAsync(persoid);
    }

}
