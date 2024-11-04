using System.Threading.Tasks;
using Xunit;
using Backend.Services;


namespace Backend.Tests.Services
{
    public class EmailServiceTests : TestBase // Inherit from TestBase to access shared setup
    {
        private readonly MockEmailService _mockEmailService;

        public EmailServiceTests()
        {
            // Use MockEmailService initialized in TestBase
            _mockEmailService = MockEmailService;
        }

        [Fact]
        public async Task SendContactUsEmail_ShouldSetCorrectProperties_WhenCalled()
        {
            // Arrange: Define email details
            var subject = "Contact Us Test Subject";
            var body = "This is a test message.";
            var senderEmail = "user@example.com";

            // Act: Call SendContactUsEmail through MockEmailService
            await _mockEmailService.SendContactUsEmail(subject, body, senderEmail);

            // Assert: Verify that MockEmailService tracked the correct values
            Assert.True(_mockEmailService.EmailWasSent, "Email should be flagged as sent.");           // Email was sent
            Assert.Equal("info@ebudget.se", _mockEmailService.LastSentEmail);                          // Recipient is hardcoded
            Assert.Equal(senderEmail, _mockEmailService.LastSenderEmail);                                // Sender's email is tracked
            Assert.Equal(subject, _mockEmailService.LastSentSubject);                                  // Subject is set correctly
            Assert.Contains(body, _mockEmailService.LastSentBody);                                     // Body is correctly set
        }

    }
}
