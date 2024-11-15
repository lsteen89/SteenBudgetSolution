using Backend.Domain.Entities;

namespace Backend.Domain.Interfaces
{
    public interface IEmailPreparationService
    {
        Task<EmailMessageModel> PrepareVerificationEmailAsync(EmailMessageModel emailMessageModel);
        Task<EmailMessageModel> PrepareContactUsEmailAsync(EmailMessageModel emailMessageModel);
    }
}
