using Backend.Domain.Entities;
using System.Threading.Tasks;

public interface IEmailService
{
    Task <bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage);
}