namespace Backend.Application.Interfaces
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
