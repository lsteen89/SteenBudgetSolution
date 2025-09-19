namespace Backend.Settings.Email;

/// <summary>
/// SmtpSettings class that holds the configuration for SMTP email settings.
/// </summary>

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Ebudget";
    public string? ContactRecipient { get; set; }
}