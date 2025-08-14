using Backend.Domain.Entities.User;

namespace Backend.Application.Interfaces.EmailServices
{
    public interface IEmailResetPasswordService
    {
        Task<bool> ResetPasswordEmailSender(UserModel user);
    }
}
