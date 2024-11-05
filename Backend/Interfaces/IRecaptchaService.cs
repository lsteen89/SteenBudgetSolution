namespace Backend.Interfaces
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
