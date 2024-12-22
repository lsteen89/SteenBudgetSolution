using Backend.Domain.Entities;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserManagementService
    {
        Task<bool> CheckIfUserExistsAsync(string email);
        Task<bool> CreateUserAsync(UserModel user);
        Task<UserModel?> GetUserByEmailAsync(string email);
        Task<bool> UpdateEmailConfirmationAsync(Guid persoid);
    }
}
