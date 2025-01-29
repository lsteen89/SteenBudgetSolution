using Backend.Application.DTO;
using Backend.Application.Models;
using Backend.Domain.Shared;
using System.Security.Claims;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserAuthenticationService
    {
        Task<ValidationResult> ValidateCredentialsAsync(string email, string password);
        Task<bool> CheckLoginAttemptsAsync(string username);
        Task RecordFailedLoginAsync(string email, string ipAddress);
        Task<bool> ShouldLockUserAsync(string email);
        Task LockUserAsync(string email, TimeSpan lockoutDuration);
        Task<bool> SendResetPasswordEmailAsync(string email);
        Task<OperationResult> UpdatePasswordAsync(Guid token, string password);
        Task HandleFailedLoginAsync(UserLoginDto userLoginDto, string ipAddress);
        AuthStatusDto CheckAuthStatus(ClaimsPrincipal user);
    }
}
