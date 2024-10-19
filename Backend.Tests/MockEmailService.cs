using Xunit;
using Moq;
using Microsoft.Extensions.Logging;

public class MockEmailServiceTests
{
    /*
    [Fact]
    public void SendVerificationEmail_ShouldLogCorrectInformation()
    {
        // Arrange
        var mockLogger = new Mock<ILogger<MockEmailService>>();
        //var emailService = new MockEmailService(mockLogger.Object);
        string testEmail = "test@example.com";
        string testToken = "123456";

        // Act
        //emailService.SendVerificationEmail(testEmail, testToken);

        // Assert
        mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains($"Mock send email to {testEmail} with token {testToken}")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()
            ), Times.Once);
    
    }
    */
}
