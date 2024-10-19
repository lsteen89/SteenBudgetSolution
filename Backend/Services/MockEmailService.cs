public class MockEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MockEmailService> _logger;

    // Properties to store the last email and token sent
    public string? LastSentEmail { get; private set; }
    public string? LastSentToken { get; private set; }

    public MockEmailService(IConfiguration configuration, ILogger<MockEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public void SendVerificationEmail(string email, string token)
    {
        // Store the email and token for testing purposes
        LastSentEmail = email;
        LastSentToken = token;

        // Generate the verification URL
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/api/Registration/verify-email?token={token}";

        // Log the generated verification URL (mimicking real email body)
        _logger.LogInformation("Mock: Generated verification URL: {VerificationUrl}", verificationUrl);

        // Log the email sending event
        _logger.LogInformation($"Mock send email to {email} with token {token}.");
    }
}
