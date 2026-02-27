using System.Globalization;

public sealed class VerificationCodeEmailComposer
{
    public VerificationCodeEmailComposer(string toEmail, string code, DateTime expiresAtUtc)
    {
        Subject = "Din verifieringskod för eBudget";
        var expLocal = expiresAtUtc.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

        BodyHtml = $@"
<div style=""font-family:system-ui,Segoe UI,Roboto,Arial"">
  <h2>Verifiera din e-post</h2>
  <p>Din kod är:</p>
  <div style=""font-size:32px;font-weight:700;letter-spacing:6px"">{code}</div>
  <p>Koden gäller till <b>{expLocal} UTC</b>.</p>
  <p>Om du inte försökte skapa ett konto kan du ignorera detta mejl.</p>
</div>";
    }

    public string Subject { get; }
    public string BodyHtml { get; }
}
