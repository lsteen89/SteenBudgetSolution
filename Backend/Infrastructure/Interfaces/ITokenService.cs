namespace Backend.Infrastructure.Interfaces
{
    public interface ITokenService
    {
        string GenerateJwtToken(string userId, string email, Dictionary<string, string>? additionalClaims = null);
    }
}
