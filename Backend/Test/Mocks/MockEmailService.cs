using System.Threading.Tasks;
using Backend.Domain.Entities;
using Backend.Application.Services;
using Backend.Infrastructure.Email;
using Microsoft.Extensions.Logging;
using Backend.Domain.Interfaces;

namespace Backend.Tests.Mocks
{
    public class MockEmailService : IEmailService
    {
        private readonly IEmailPreparationService _emailPreparationService;
        private readonly ILogger<MockEmailService> _logger;


        public MockEmailService(IEmailPreparationService emailPreparationService, ILogger<MockEmailService> logger)
        {
            _emailPreparationService = emailPreparationService;
            _logger = logger;
        }

        // Main method to simulate processing and sending an email
        public async Task<bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage)
        {
            try
            {
                _logger.LogInformation("MockEmailService: Preparing email for {EmailType} to {Recipient}", emailMessage.EmailType, emailMessage.Recipient);

                emailMessage = await PrepareEmailAsync(emailMessage);

                // Simulate the sending part
                _logger.LogInformation("MockEmailService: Pretending to send email to {Recipient}", emailMessage.Recipient);
                return await Task.FromResult(true); // Simulate a successful send

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing mock email for {Recipient}", emailMessage.Recipient);
                return false;
            }
        }

        // New helper method to prepare the email and return it for testing purposes
        public async Task<EmailMessageModel> PrepareEmailForTestAsync(EmailMessageModel emailMessage)
        {
            _logger.LogInformation("MockEmailService: Preparing email for test for {EmailType} to {Recipient}", emailMessage.EmailType, emailMessage.Recipient);
            return await PrepareEmailAsync(emailMessage);
        }

        // Shared private method for preparation logic
        private async Task<EmailMessageModel> PrepareEmailAsync(EmailMessageModel emailMessage)
        {
            switch (emailMessage.EmailType)
            {
                case EmailType.Verification:
                    return await _emailPreparationService.PrepareVerificationEmailAsync(emailMessage);
                case EmailType.ContactUs:
                    return await _emailPreparationService.PrepareContactUsEmailAsync(emailMessage);
                default:
                    throw new InvalidOperationException("Unknown email type");
            }
        }
    }
}


