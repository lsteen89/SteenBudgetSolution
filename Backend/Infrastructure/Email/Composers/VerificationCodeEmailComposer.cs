using System.Globalization;
using Backend.Application.Validators.Locale;

public sealed class VerificationCodeEmailComposer
{
  public VerificationCodeEmailComposer(
      string code,
      DateTime expiresAtUtc,
      string? locale,
      string loginUrl,
      string forgotPasswordUrl,
      string recoveryUrl)
  {
    var safeLocale = UserLocale.Normalize(locale); // "sv-SE" | "en-US" | "et-EE"
    var expiresUtcText = expiresAtUtc.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

    (Subject, BodyHtml) = safeLocale switch
    {
      "en-US" => BuildEnglish(code, expiresUtcText, loginUrl, forgotPasswordUrl, recoveryUrl),
      "et-EE" => BuildEstonian(code, expiresUtcText, loginUrl, forgotPasswordUrl, recoveryUrl),
      _ => BuildSwedish(code, expiresUtcText, loginUrl, forgotPasswordUrl, recoveryUrl),
    };
  }

  public string Subject { get; }
  public string BodyHtml { get; }

  private static (string Subject, string BodyHtml) BuildEnglish(
      string code,
      string expiresUtcText,
      string loginUrl,
      string forgotPasswordUrl,
      string recoveryUrl)
  {
    return (
        "Your eBudget verification code",
        BuildHtml(
            title: "Verify your email",
            codeLabel: "Your code is:",
            code: code,
            expiryText: $"The code is valid until <b>{expiresUtcText} UTC</b>.",
            instructionText: "To verify your account, log in and follow the instructions.",
            primaryCtaText: "Log in",
            primaryCtaUrl: loginUrl,
            forgotPasswordText: "Forgot your password?",
            forgotPasswordUrl: forgotPasswordUrl,
            recoveryText: "Need a new code?",
            recoveryUrl: recoveryUrl,
            ignoreText: "If you didn’t try to create an account, you can ignore this email."
        )
    );
  }

  private static (string Subject, string BodyHtml) BuildEstonian(
      string code,
      string expiresUtcText,
      string loginUrl,
      string forgotPasswordUrl,
      string recoveryUrl)
  {
    return (
        "Sinu eBudgeti kinnituskood",
        BuildHtml(
            title: "Kinnita oma e-post",
            codeLabel: "Sinu kood on:",
            code: code,
            expiryText: $"Kood kehtib kuni <b>{expiresUtcText} UTC</b>.",
            instructionText: "Oma konto kinnitamiseks logi sisse ja järgi juhiseid.",
            primaryCtaText: "Logi sisse",
            primaryCtaUrl: loginUrl,
            forgotPasswordText: "Unustasid parooli?",
            forgotPasswordUrl: forgotPasswordUrl,
            recoveryText: "Vajad uut koodi?",
            recoveryUrl: recoveryUrl,
            ignoreText: "Kui sina ei proovinud kontot luua, võid selle e-kirja eirata."
        )
    );
  }

  private static (string Subject, string BodyHtml) BuildSwedish(
      string code,
      string expiresUtcText,
      string loginUrl,
      string forgotPasswordUrl,
      string recoveryUrl)
  {
    return (
        "Din verifieringskod för eBudget",
        BuildHtml(
            title: "Verifiera din e-post",
            codeLabel: "Din kod är:",
            code: code,
            expiryText: $"Koden gäller till <b>{expiresUtcText} UTC</b>.",
            instructionText: "För att verifiera ditt konto, logga in och följ anvisningarna.",
            primaryCtaText: "Logga in",
            primaryCtaUrl: loginUrl,
            forgotPasswordText: "Glömt lösenordet?",
            forgotPasswordUrl: forgotPasswordUrl,
            recoveryText: "Behöver du en ny kod?",
            recoveryUrl: recoveryUrl,
            ignoreText: "Om du inte försökte skapa ett konto kan du ignorera detta mejl."
        )
    );
  }

  private static string BuildHtml(
      string title,
      string codeLabel,
      string code,
      string expiryText,
      string instructionText,
      string primaryCtaText,
      string primaryCtaUrl,
      string forgotPasswordText,
      string forgotPasswordUrl,
      string recoveryText,
      string recoveryUrl,
      string ignoreText)
  {
    return $@"
<div style=""font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.6;padding:24px;max-width:560px;margin:0 auto;"">
  <h2 style=""margin:0 0 16px 0;font-size:24px;"">{title}</h2>

  <p style=""margin:0 0 8px 0;"">{codeLabel}</p>

<div data-test-id=""verification-code""
     style=""margin:0 0 20px 0;padding:14px 18px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;
            font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;color:#0f172a;"">
  {code}
</div>

  <p style=""margin:0 0 8px 0;"">{expiryText}</p>
  <p style=""margin:0 0 18px 0;"">{instructionText}</p>

  <p style=""margin:0 0 18px 0;"">
    <a href=""{primaryCtaUrl}""
       style=""display:inline-block;padding:12px 18px;border-radius:14px;text-decoration:none;
              font-weight:700;background:#22c55e;color:#ffffff;"">
      {primaryCtaText}
    </a>
  </p>

  <p style=""margin:0 0 8px 0;"">
    <a href=""{forgotPasswordUrl}"" style=""color:#2563eb;text-decoration:underline;"">
      {forgotPasswordText}
    </a>
  </p>

  <p style=""margin:0 0 18px 0;"">
    <a href=""{recoveryUrl}"" style=""color:#2563eb;text-decoration:underline;"">
      {recoveryText}
    </a>
  </p>

  <p style=""margin:0;color:#475569;font-size:14px;"">{ignoreText}</p>
</div>";
  }
}