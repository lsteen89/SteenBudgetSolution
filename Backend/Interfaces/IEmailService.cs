using Backend.Models;
using System.Threading.Tasks;

public interface IEmailService
{
    Task <bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage);
}