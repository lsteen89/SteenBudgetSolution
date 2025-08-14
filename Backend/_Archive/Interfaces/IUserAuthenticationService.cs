using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Models.Auth;
using Backend.Domain.Shared;
using System.Security.Claims;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserAuthenticationService
    {
        /*
        [Obsolete("Use IUserAuthenticationRepository instead.")]
        Task<ValidationResult> ValidateCredentialsAsync(string email, string password);
        [Obsolete("Use repo IUserAuthenticationRepository instead.")]
        Task<bool> CheckLoginAttemptsAsync(string username);
        Task RecordFailedLoginAsync(string email, string ipAddress);
        Task<bool> ShouldLockUserAsync(string email);
        Task LockUserAsync(string email, TimeSpan lockoutDuration);
        */
        Task<bool> SendResetPasswordEmailAsync(string email);
        Task<OperationResult> UpdatePasswordAsync(Guid token, string password);
        /*
        [Obsolete("Use IUserAuthenticationRepository instead.")]
        Task HandleFailedLoginAsync(UserLoginDto userLoginDto, string ipAddress);
        */
        Task<AuthStatusDto> CheckAuthStatusAsync(ClaimsPrincipal user);
    }
}
