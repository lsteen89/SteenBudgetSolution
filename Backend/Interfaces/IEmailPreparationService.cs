using Backend.Models;

namespace Backend.Interfaces
{
    public interface IEmailPreparationService
    {
        Task<EmailMessageModel> PrepareVerificationEmailAsync(EmailMessageModel emailMessageModel);
        Task<EmailMessageModel> PrepareContactUsEmailAsync(EmailMessageModel emailMessageModel);
    }
}
