using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Options.Verification;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Verification;

public sealed class TurnstileService : ITurnstileService
{
    private readonly HttpClient _http;
    private readonly TurnstileOptions _opt;
    private readonly ILogger<TurnstileService> _log;
    private readonly IHostEnvironment _env;

    public TurnstileService(HttpClient http, IOptions<TurnstileOptions> opt, ILogger<TurnstileService> log, IHostEnvironment env)
    {
        _http = http;
        _opt = opt.Value;
        _log = log;
        _env = env;
    }

    public async Task<bool> ValidateAsync(string token, string? remoteIp, CancellationToken ct)
    {
        if (!_opt.Enabled) return true;
        if (string.IsNullOrWhiteSpace(token)) return false;

        var form = new Dictionary<string, string>
        {
            ["secret"] = (_opt.SecretKey ?? "").Trim(),
            ["response"] = token.Trim()
        };
        if (!string.IsNullOrWhiteSpace(remoteIp))
            form["remoteip"] = remoteIp;
        _log.LogWarning(
            "Turnstile config: Enabled={Enabled} VerifyUrl={Url} Env={Env} SecretLen={Len} SecretHead={Head} SecretTail={Tail}",
            _opt.Enabled,
            _opt.VerifyUrl,
            _env.EnvironmentName,
            _opt.SecretKey?.Length ?? 0,
            _opt.SecretKey is { Length: >= 4 } ? _opt.SecretKey[..4] : "<null>",
            _opt.SecretKey is { Length: >= 4 } ? _opt.SecretKey[^4..] : "<null>"
            );

        using var resp = await _http.PostAsync(_opt.VerifyUrl, new FormUrlEncodedContent(form), ct);
        var body = await resp.Content.ReadFromJsonAsync<TurnstileVerifyResponse>(cancellationToken: ct);

        if (!resp.IsSuccessStatusCode)
        {
            _log.LogWarning("Turnstile verify HTTP {Status}. RemoteIp={RemoteIp} Codes={Codes}",
                (int)resp.StatusCode,
                remoteIp ?? "-",
                body?.ErrorCodes is null ? "-" : string.Join(",", body.ErrorCodes));
            return false;
        }

        if (body?.Success == true) return true;

        _log.LogWarning("Turnstile verify failed. Hostname={Hostname} RemoteIp={RemoteIp} Codes={Codes}",
            body?.Hostname ?? "-",
            remoteIp ?? "-",
            body?.ErrorCodes is null ? "-" : string.Join(",", body.ErrorCodes));

        return false;
    }

    private sealed class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }

        [JsonPropertyName("hostname")]
        public string? Hostname { get; set; }

        [JsonPropertyName("challenge_ts")]
        public DateTimeOffset? ChallengeTs { get; set; }
    }
}
