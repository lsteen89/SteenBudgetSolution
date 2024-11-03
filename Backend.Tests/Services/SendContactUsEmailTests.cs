using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Tests.Services
{
    private readonly MockEmailService _mockEmailService;

    public EmailServiceTests()
    {
        // Arrange: Set up the test services and configuration using StartupTest
        var services = new ServiceCollection();
        var startup = new StartupTest();
        startup.ConfigureServices(services);


        // Resolve MockEmailService from DI to use for assertions
        _mockEmailService = _serviceProvider.GetService<IEmailService>() as MockEmailService
                            ?? throw new InvalidOperationException("MockEmailService not registered.");
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
        Assert.True(_mockEmailService.EmailWasSent, "Email should be flagged as sent.");
        Assert.Equal("info@ebudget.se", _mockEmailService.LastSentEmail);   // Confirm the recipient is set correctly
        Assert.Equal(senderEmail, _mockEmailService.LastSentToken);         // Verify the sender's email
        Assert.Contains(body, _mockEmailService.LastSentToken);             // Ensure the body was correctly set
        Assert.Equal(subject, _mockEmailService.LastSentSubject);           // If LastSentSubject is tracked for subject
    }

    // Dispose of services after tests complete
    public void Dispose()
    {
        _serviceProvider.Dispose();
    }
}
