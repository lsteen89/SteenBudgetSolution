using Backend.Domain.Entities;
using MimeKit;

namespace Backend.Application.Interfaces.EmailServices
{
    public interface IEmailSender
    {
        Task<bool> TrySendEmailAsync(EmailMessageModel emailMessageModel);
    }
}
