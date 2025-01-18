using Backend.Application.DTO;
using Backend.Domain.Entities;
using System.Security.Claims;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserManagementService
    {
        AuthStatusDto CheckAuthStatus(ClaimsPrincipal user);
        Task<bool> CheckIfUserExistsAsync(string email);
        Task<bool> CreateUserAsync(UserModel user);
        Task<UserModel?> GetUserByEmailAsync(string email);
        Task<int> UpdateEmailConfirmationAsync(Guid persoid);
        Task<bool> IsEmailAlreadyConfirmedAsync(Guid persoid);
    }
}
