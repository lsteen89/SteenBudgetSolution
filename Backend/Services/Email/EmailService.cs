public class EmailService : EmailSenderBase, IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        : base(configuration, logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string email, string token)
    {
        // Generate the verification URL
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/verify-email?token={token}";
        _logger.LogInformation("Generated verification URL: {VerificationUrl}", verificationUrl);

        // Define the subject and body
        var subject = "Email Verification";
        var body = $"Please verify your email by clicking the following link: <a href='{verificationUrl}'>Verify Email</a>";

        // Send the email using the base class method
        await SendEmailAsync(email, subject, body);
    }
}
