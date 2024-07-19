using Microsoft.Extensions.Logging;

public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;
    public string LastSentEmail { get; private set; }
    public string LastSentToken { get; private set; }

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public void SendVerificationEmail(string email, string token)
    {
        LastSentEmail = email;
        LastSentToken = token;
        _logger.LogInformation($"Mock send email to {email} with token {token}");
    }
}
