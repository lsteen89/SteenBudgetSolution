using Backend.Application.Interfaces;
using Backend.Application.Interfaces.EmailServices;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;

namespace Backend.Application.Services.EmailServices
{
    public class EmailResetPasswordService : IEmailResetPasswordService
    {
        private readonly ITokenSqlExecutor _tokenSqlExecutor;
        private readonly IEmailService _emailService;
        public EmailResetPasswordService(ITokenSqlExecutor tokenSqlExecutor, IEmailService emailService)
        {
            _tokenSqlExecutor = tokenSqlExecutor;
            _emailService = emailService;
        }
        public async Task<bool> ResetPasswordEmailSender(UserModel user)
        {
            // Generate a reset token
            var token = Guid.NewGuid();
            await _tokenSqlExecutor.SaveResetTokenAsync(user.PersoId, token);

            // Prepare the reset email
            var emailMessage = PrepareResetPasswordMessage(user.Email, token);

            // Send the email
            return await _emailService.ProcessAndSendEmailAsync(emailMessage);
        }
        private EmailMessageModel PrepareResetPasswordMessage(string email, Guid Token)
        {
            var emailMessage = new EmailMessageModel
            {
                Recipient = email,
                EmailType = EmailType.Verification,
                Token = Token
            };
            return emailMessage;
        }
    }
}
