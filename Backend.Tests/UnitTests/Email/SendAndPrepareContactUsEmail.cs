using System.Threading.Tasks;
using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Backend.Application.Services;
using Backend.Domain.Entities;
using System;
using Backend.Tests.Mocks;
using Backend.Application.Interfaces.EmailServices;

namespace Backend.Tests.UnitTests.Email;

    public class SendAndPrepareContactUsEmail
    {
    private readonly Mock<IEmailPreparationService> _emailPreparationServiceMock;
    private readonly Mock<ILogger<MockEmailService>> _loggerMock;
    private readonly MockEmailService _mockEmailService;

    public SendAndPrepareContactUsEmail()
    {
        _emailPreparationServiceMock = new Mock<IEmailPreparationService>();
        _loggerMock = new Mock<ILogger<MockEmailService>>();

        // Initialize the MockEmailService with mocked dependencies
        _mockEmailService = new MockEmailService(_loggerMock.Object, _emailPreparationServiceMock.Object);
    }

    [Fact]
    public async Task SendContactUsEmail_ShouldPrepareAndSendCorrectly()
    {
        // Arrange: Simulate a "Contact Us" email preparation
        var emailMessage = new EmailMessageModel
        {
            Recipient = "support@example.com",
            Subject = "Inquiry from a Customer",
            Body = "I have an issue with my account.",
            EmailType = EmailType.ContactUs
        };

        var expectedPreparedEmail = new EmailMessageModel
        {
            Recipient = "support@example.com",
            Subject = "Inquiry from a Customer",
            Body = "I have an issue with my account.",
            Sender = "support@ebudget.se",
            FromName = "Customer Support"
        };

        // Mock the preparation service to return the expected result
        _emailPreparationServiceMock
            .Setup(service => service.PrepareContactUsEmailAsync(It.IsAny<EmailMessageModel>()))
            .ReturnsAsync(expectedPreparedEmail);

        // Act: Call the method to prepare and send the "Contact Us" email
        var preparedEmail = await _mockEmailService.PrepareEmailForTestAsync(emailMessage);

        // Assert: Verify the email fields after preparation
        Assert.Equal(expectedPreparedEmail.Recipient, preparedEmail.Recipient);
        Assert.Equal(expectedPreparedEmail.Subject, preparedEmail.Subject);
        Assert.Equal(expectedPreparedEmail.Body, preparedEmail.Body);
        Assert.Equal(expectedPreparedEmail.Sender, preparedEmail.Sender);
        Assert.Equal(expectedPreparedEmail.FromName, preparedEmail.FromName);

        // Verify that the preparation method was called once for ContactUs
        _emailPreparationServiceMock.Verify(service => service.PrepareContactUsEmailAsync(It.IsAny<EmailMessageModel>()), Times.Once);
    }
}