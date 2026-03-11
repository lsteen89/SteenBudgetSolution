using System.Globalization;
using Backend.Application.Validators.Locale;

namespace Backend.Infrastructure.Email.Composers.Auth;

public sealed class ResetPasswordEmailComposer
{
    public string Subject { get; }
    public string BodyHtml { get; }

    public ResetPasswordEmailComposer(
        string code,
        DateTime expiresAtUtc,
        string? locale,
        string loginUrl,
        string forgotPasswordUrl)
    {
        var safe = UserLocale.Normalize(locale); // "sv-SE" | "en-US" | "et-EE"
        var expLocal = expiresAtUtc.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

        (Subject, BodyHtml) = safe switch
        {
            "sv-SE" => (
                "Återställ ditt eBudget-lösenord",
                $"""
                <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
                  <h2>Återställ ditt lösenord</h2>
                  <p>Din kod är:</p>
                  <div style="font-size:32px;font-weight:700;letter-spacing:6px">{code}</div>
                  <p>Koden gäller till <b>{expLocal} UTC</b>.</p>
                  <p>Om du inte begärde detta kan du ignorera mejlet.</p>
                </div>
                """
            ),
            "et-EE" => (
                "Taasta oma eBudgeti parool",
                $"""
                <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
                  <h2>Taasta oma parool</h2>
                  <p>Sinu kood on:</p>
                  <div style="font-size:32px;font-weight:700;letter-spacing:6px">{code}</div>
                  <p>Kood kehtib kuni <b>{expLocal} UTC</b>.</p>
                  <p>Kui sa ei taotlenud seda, võid selle kirja ignoreerida.</p>
                </div>
                """
            ),
            _ => (
                "Reset your eBudget password",
                $"""
                <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
                  <h2>Reset your password</h2>
                  <p>Your code is:</p>
                    <div data-test-id="verification-code"
                        style="font-size:32px;font-weight:700;letter-spacing:6px">
                    {code}
                    </div>
                  <p>The code is valid until <b>{expLocal} UTC</b>.</p>
                  <p>If you didn’t request this, you can ignore this email.</p>
                </div>
                """
            )
        };
    }
}