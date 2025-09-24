using Microsoft.IdentityModel.Tokens;
using Backend.Application.Abstractions.Infrastructure.Auth;

namespace Backend.Infrastructure.Auth;

public sealed class HsKeyRing : IJwtKeyRing
{
    public string ActiveKid { get; }
    public SymmetricSecurityKey ActiveKey { get; }
    public IReadOnlyDictionary<string, SecurityKey> All { get; }

    public HsKeyRing(IConfiguration cfg)
    {

        var jwt = cfg.GetSection("Jwt");
        ActiveKid = jwt["ActiveKid"] ?? throw new InvalidOperationException("Jwt:ActiveKid missing");
        var items = jwt.GetSection("Keys").GetChildren().ToArray();
        if (items.Length == 0) throw new InvalidOperationException("Jwt:Keys empty");

        var dict = new Dictionary<string, SecurityKey>(StringComparer.Ordinal);
        foreach (var kv in items)
        {
            var kid = kv.Key;
            var raw = ResolveValue(cfg, kv.Value ?? string.Empty).Trim(); // <- trim
            byte[] bytes;
            try { bytes = Convert.FromBase64String(raw); }
            catch (FormatException) { throw new InvalidOperationException($"Jwt key {kid} is not valid base64"); }

            if (bytes.Length < 32) // 256-bit minimum
                throw new InvalidOperationException($"Jwt key {kid} too short; need ≥ 32 bytes");

            var key = new SymmetricSecurityKey(bytes) { KeyId = kid };
            dict[kid] = key;
        }

        if (!dict.TryGetValue(ActiveKid, out var active))
            throw new InvalidOperationException($"ActiveKid '{ActiveKid}' not found in Jwt:Keys");

        All = dict;
        ActiveKey = (SymmetricSecurityKey)active;
    }

    private static string ResolveValue(IConfiguration cfg, string v)
    {
        if (v.StartsWith("__ENV__:", StringComparison.Ordinal))
            return Environment.GetEnvironmentVariable(v[8..])
                   ?? throw new InvalidOperationException($"Env '{v[8..]}' missing");
        if (v.StartsWith("__FILE__:", StringComparison.Ordinal))
            return File.ReadAllText(v[9..]).Trim();
        return v; // inline base64 via docker env substitution
    }
}
