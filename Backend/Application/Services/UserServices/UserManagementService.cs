﻿using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.DTO;
using System.Security.Claims;

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

        // This method checks if the user needs to go through the initial setup process.
        public async Task<bool> NeedsInitialSetupAsync(string email) =>
            (await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: email)).FirstLogin;
    }

}
