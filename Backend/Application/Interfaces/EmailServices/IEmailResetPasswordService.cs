using Backend.Domain.Entities;

namespace Backend.Application.Interfaces.EmailServices
{
    public interface IEmailResetPasswordService
    {
        Task<bool> ResetPasswordEmailSender(UserModel user);
    }
}
