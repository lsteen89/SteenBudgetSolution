namespace Backend.Application.Interfaces.RecaptchaService
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
