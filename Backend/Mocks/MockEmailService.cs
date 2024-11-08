using Backend.Models;

public class MockEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MockEmailService> _logger;

    public string? LastSentEmail { get; private set; }
    public string? LastSentToken { get; private set; }
    public string? LastSenderEmail { get; private set; }
    public bool EmailWasSent { get; private set; }
    public string? LastSentSubject { get; private set; }
    public string? LastSentBody { get; private set; }

    public MockEmailService(IConfiguration configuration, ILogger<MockEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }
    public async Task<bool> ProcessAndSendEmailAsync(EmailMessageModel emailMessage)
    {
        throw new NotImplementedException();
    }
    public async Task SendVerificationEmailAsync(string email, string token)
    {
        // Store the email and token for testing purposes
        LastSentEmail = email;
        LastSentToken = token;
        EmailWasSent = true;

        // Generate the verification URL
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/api/Registration/verify-email?token={token}";

        // Mimic async behavior
        await Task.Delay(1); // Simulate an asynchronous operation

        // Log the generated verification URL
        _logger.LogInformation("Mock: Generated verification URL: {VerificationUrl}", verificationUrl);

        // Log the email sending event
        _logger.LogInformation($"Mock send email to {email} with token {token}.");
    }
    public async Task SendContactUsEmail(string subject, string body, string senderEmail)
    {
        // Set mock properties for testing
        LastSentEmail = "info@ebudget.se";      // Hardcoded recipient
        LastSenderEmail  = senderEmail;            // Track sender's email
        LastSentSubject = subject;              // Track subject
        LastSentBody = body;                    // Track body content
        EmailWasSent = true;

        // Log the email sending event
        _logger.LogInformation($"Mock send email to {LastSentEmail} with subject {subject} and body {body}.");

        await Task.CompletedTask;
    }


}
