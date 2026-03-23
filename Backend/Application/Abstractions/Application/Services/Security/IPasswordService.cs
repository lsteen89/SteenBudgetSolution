namespace Backend.Application.Abstractions.Application.Services.Security;

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string password, string hash);
}