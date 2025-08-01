namespace Backend.Application.Interfaces.Email;
public interface IEmailContentFactory
{
    (string Subject, string Body) CreateVerificationEmail(string verificationToken);
}
