namespace Backend.Application.Abstractions.Infrastructure.Security
{
    [Obsolete("ReCAPTCHA v2 and v3 are deprecated. Use Turnstile instead.")]
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string token);
    }
}
