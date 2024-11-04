using System.Threading.Tasks;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string token);
    Task SendContactUsEmail(string subject, string body, string SenderEmail);
}