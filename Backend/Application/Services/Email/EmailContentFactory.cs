using Backend.Application.Interfaces.Email;

// <summary>
// EmailContentFactory class that creates email content based on the type of email.
// </summary>

namespace Backend.Application.Services.Email;

public class EmailContentFactory : IEmailContentFactory
{
    private readonly IConfiguration _configuration;

    public EmailContentFactory(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Subject, string Body) CreateVerificationEmail(string verificationToken)
    {
        var verificationUrl = $"{_configuration["AppSettings:BaseUrl"]}/email-confirmation?token={verificationToken}";
        var subject = "Epost verifiering - Bekräfta din e-postadress";
        var body = $"<h1>Välkommen till eBudget!</h1><p>Vänligen klicka på länken nedan för att bekräfta din e-postadress:</p><a href='{verificationUrl}'>Bekräfta E-post</a>";

        return (subject, body);
    }
}