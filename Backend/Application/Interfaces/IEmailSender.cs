using Backend.Domain.Entities;
using MimeKit;

namespace Backend.Application.Interfaces
{
    public interface IEmailSender
    {
        Task<bool> TrySendEmailAsync(EmailMessageModel emailMessageModel);
    }
}
