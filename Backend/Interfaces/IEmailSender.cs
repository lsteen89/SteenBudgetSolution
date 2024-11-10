using Backend.Models;
using MimeKit;

namespace Backend.Interfaces
{
    public interface IEmailSender
    {
        Task<bool> TrySendEmailAsync(EmailMessageModel emailMessageModel);
    }
}
