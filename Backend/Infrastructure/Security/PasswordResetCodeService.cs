using System.Security.Cryptography;
using System.Text;
using Backend.Application.Abstractions.Infrastructure.Security;

namespace Backend.Infrastructure.Security;

public sealed class PasswordResetCodeService : IPasswordResetCodeService
{
    public string GenerateCode()
    {
        var value = RandomNumberGenerator.GetInt32(100000, 1000000);
        return value.ToString();
    }

    public string HashCode(string code)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public bool VerifyCode(string code, string storedHash)
    {
        var computed = HashCode(code);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(storedHash)
        );
    }
}