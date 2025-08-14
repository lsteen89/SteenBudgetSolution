namespace Backend.Application.Abstractions.Infrastructure.Security
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
