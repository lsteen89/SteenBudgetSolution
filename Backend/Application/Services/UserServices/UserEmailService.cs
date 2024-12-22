using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;


namespace Backend.Application.Services.UserServices
{
    public class UserEmailService : IUserEmailService
    {
        private readonly IEmailService _emailService;
        private readonly IEmailVerificationService _emailVerificationService;
        private readonly ILogger<UserEmailService> _logger;


        public UserEmailService(IEmailService emailService, IEmailVerificationService emailVerificationService, ILogger<UserEmailService> logger)
        {
            _emailService = emailService;
            _emailVerificationService = emailVerificationService;
            _logger = logger;
        }


        public async Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email) =>
            await _emailVerificationService.ResendVerificationEmailAsync(email);
        private async Task<bool> SendVerificationEmailAsync(string email)
        {
            var emailSent = await _emailVerificationService.SendVerificationEmailWithTokenAsync(email);
            if (!emailSent) _logger.LogError("Failed to send verification email for user with email: {Email}", email);
            return emailSent;
        }
    }
}
