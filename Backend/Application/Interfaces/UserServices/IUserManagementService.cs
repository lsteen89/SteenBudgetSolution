using Backend.Domain.Entities;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserManagementService
    {
        Task<bool> CheckIfUserExistsAsync(string email);
        Task<bool> CreateUserAsync(UserModel user);
        Task<UserModel?> GetUserByEmailAsync(string email);
        Task<int> UpdateEmailConfirmationAsync(Guid persoid);
        Task<bool> IsEmailAlreadyConfirmedAsync(Guid persoid);
    }
}
