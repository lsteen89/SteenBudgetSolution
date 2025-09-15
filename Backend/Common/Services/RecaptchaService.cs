using Backend.Application.Abstractions.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text.Json;

namespace Backend.Common.Services
{
    public sealed class RecaptchaService : IRecaptchaService
    {
        private readonly HttpClient _http;
        private readonly ILogger<RecaptchaService> _log;
        private readonly string _secret;

        public RecaptchaService(IConfiguration cfg, ILogger<RecaptchaService> log, HttpClient http)
        {
            _http = http;
            _log = log;
            // Prefer appsettings/user-secrets, fallback to raw env var
            _secret = cfg["Recaptcha:SecretKey"] ?? cfg["RECAPTCHA_SECRET_KEY"]
                ?? throw new InvalidOperationException("reCAPTCHA secret key not found.");
        }

        public async Task<bool> ValidateTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                _log.LogWarning("reCAPTCHA token missing.");
                return false;
            }

            using var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string,string>("secret", _secret),
                new KeyValuePair<string,string>("response", token)
                // optionally: new("remoteip", httpContext.Connection.RemoteIpAddress?.ToString() ?? "")
            });

            try
            {
                using var resp = await _http.PostAsync("https://www.google.com/recaptcha/api/siteverify", content);
                var json = await resp.Content.ReadAsStringAsync();

                // Minimal parse (avoid Newtonsoft dependency here)
                var doc = JsonDocument.Parse(json);
                var success = doc.RootElement.TryGetProperty("success", out var s) && s.GetBoolean();

                if (!success)
                {
                    _log.LogWarning("reCAPTCHA failed. Response: {Resp}", json);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "reCAPTCHA validation error");
                return false;
            }
        }
    }
}
