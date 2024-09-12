using Microsoft.Extensions.Logging;

public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;

    // Properties to store the last email and token sent
    public string LastSentEmail { get; private set; }
    public string LastSentToken { get; private set; }

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public void SendVerificationEmail(string email, string token)
    {
        _logger.LogInformation($"Mock send email to {email} with token {token}");
    }
}
