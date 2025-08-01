namespace Backend.Application.Interfaces.Email; 

public interface IEmailService
{
    Task SendEmailAsync(string recipient, string subject, string body);
}