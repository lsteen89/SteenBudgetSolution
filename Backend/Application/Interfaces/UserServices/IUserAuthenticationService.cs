using Backend.Application.DTO;
using Backend.Application.Models;

namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserAuthenticationService
    {
        Task<ValidationResult> ValidateCredentialsAsync(string email, string password);
        Task<LoginResultDto> LoginAsync(string email);
    }
}
