using Backend.Domain.Entities;
using MimeKit;

namespace Backend.Domain.Interfaces
{
    public interface IEmailSender
    {
        Task<bool> TrySendEmailAsync(EmailMessageModel emailMessageModel);
    }
}
