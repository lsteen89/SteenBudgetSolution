using Microsoft.Extensions.Logging;

public class MockEmailService : IEmailService
{
    private readonly ILogger<MockEmailService> _logger;

    public MockEmailService(ILogger<MockEmailService> logger)
    {
        _logger = logger;
    }

    public void SendVerificationEmail(string email, string token)
    {
        _logger.LogInformation($"Mock send email to {email} with token {token}");
    }
}
