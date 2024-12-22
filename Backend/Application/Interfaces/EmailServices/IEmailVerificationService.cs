namespace Backend.Application.Interfaces.EmailServices
{
    public interface IEmailVerificationService
    {
        Task<bool> SendVerificationEmailWithTokenAsync(string email);
        Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email);
    }
}
