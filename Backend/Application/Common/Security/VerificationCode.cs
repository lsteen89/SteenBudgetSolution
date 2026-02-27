using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Application.Common.Security;

public static class VerificationCode
{
    public static string New6Digits()
    {
        var n = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return n.ToString("D6", CultureInfo.InvariantCulture);
    }

    // HMAC(secret, $"{persoId:N}:{code}") => 32 bytes
    public static byte[] Hash(Guid persoId, string code, byte[] secretKey)
    {
        using var hmac = new HMACSHA256(secretKey);
        var msg = Encoding.UTF8.GetBytes($"{persoId:N}:{code}");
        return hmac.ComputeHash(msg);
    }

    public static bool FixedTimeEquals(byte[] a, byte[] b)
        => a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
}
