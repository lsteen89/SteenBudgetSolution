namespace Backend.Application.Abstractions.Infrastructure.Security;

public interface IPasswordResetCodeService
{
    string GenerateCode();
    string HashCode(string code);
    bool VerifyCode(string code, string storedHash);
}