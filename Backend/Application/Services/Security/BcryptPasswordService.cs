using Backend.Application.Abstractions.Application.Services.Security;

namespace Backend.Application.Services.Security;

public sealed class BcryptPasswordService : IPasswordService
{
    public string Hash(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string hash) =>
        BCrypt.Net.BCrypt.Verify(password, hash);
}