using Backend.Domain.Entities;

namespace Backend.Application.Interfaces.EmailServices
{
    public interface IEmailPreparationService
    {
        Task<EmailMessageModel> PrepareVerificationEmailAsync(EmailMessageModel emailMessageModel);
        Task<EmailMessageModel> PrepareContactUsEmailAsync(EmailMessageModel emailMessageModel);
    }
}
