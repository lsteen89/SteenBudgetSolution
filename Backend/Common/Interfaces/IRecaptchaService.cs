namespace Backend.Common.Interfaces
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
