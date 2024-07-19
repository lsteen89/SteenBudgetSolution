public interface IEmailService
{
    void SendVerificationEmail(string email, string token);
}
