using Backend.Domain.Entities.Email;

namespace Backend.Application.Interfaces.EmailServices
{
    public interface ILegacyEmailPreparationService
    {
        Task<EmailMessageModel> PrepareVerificationEmailAsync(EmailMessageModel emailMessageModel);
        Task<EmailMessageModel> PrepareContactUsEmailAsync(EmailMessageModel emailMessageModel);
        Task<EmailMessageModel> PrepareResetPasswordMessage(EmailMessageModel emailMessageModel);
    }
}
