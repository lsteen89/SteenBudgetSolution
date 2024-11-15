using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Backend.Application.Services;
using Backend.Helpers;
using Backend.Tests.Mocks;
using System;
using Backend.Domain.Entities;
using Backend.Domain.Interfaces;

public class SendAndPrepareVerificationEmail
{
    private readonly Mock<IEmailPreparationService> _emailPreparationServiceMock;
    private readonly Mock<ILogger<MockEmailService>> _loggerMock;
    private readonly MockEmailService _mockEmailService;

    public SendAndPrepareVerificationEmail()
    {
        _emailPreparationServiceMock = new Mock<IEmailPreparationService>();
        _loggerMock = new Mock<ILogger<MockEmailService>>();

        // Initialize the MockEmailService with mocked dependencies
        _mockEmailService = new MockEmailService(_emailPreparationServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task SendVerificationEmailAfterUserRegistration_ShouldPrepareAndSendCorrectly()
    {
        // Arrange: Simulate a new user registration and verification email preparation
        var emailMessage = new EmailMessageModel
        {
            Recipient = "newuser@example.com",
            Token = Guid.NewGuid(),
            EmailType = EmailType.Verification
        };

        var expectedPreparedEmail = new EmailMessageModel
        {
            Recipient = "newuser@example.com",
            Subject = "Email Verification",
            Body = "Please verify your email by clicking the following link: <a href='https://yourdomain.com/verify-email?token=12345-67890-ABCDE'>Verify Email</a>",
            Sender = "no-reply@ebudget.se",
            FromName = "No Reply"
        };

        // Mock the preparation service to return the expected result
        _emailPreparationServiceMock
            .Setup(service => service.PrepareVerificationEmailAsync(It.IsAny<EmailMessageModel>()))
            .ReturnsAsync(expectedPreparedEmail);

        // Act: Call the method to prepare and send the verification email
        var preparedEmail = await _mockEmailService.PrepareEmailForTestAsync(emailMessage);

        // Assert: Verify the email fields after preparation
        Assert.Equal(expectedPreparedEmail.Recipient, preparedEmail.Recipient);
        Assert.Equal(expectedPreparedEmail.Subject, preparedEmail.Subject);
        Assert.Equal(expectedPreparedEmail.Body, preparedEmail.Body);
        Assert.Equal(expectedPreparedEmail.Sender, preparedEmail.Sender);
        Assert.Equal(expectedPreparedEmail.FromName, preparedEmail.FromName);

        // Verify that the preparation method was called once
        _emailPreparationServiceMock.Verify(service => service.PrepareVerificationEmailAsync(It.IsAny<EmailMessageModel>()), Times.Once);

        // Log the outcome
        //_loggerMock.Verify(logger => logger.LogInformation("MockEmailService: Pretending to send email to {Recipient}", emailMessage.Recipient), Times.Once);
    }
}
