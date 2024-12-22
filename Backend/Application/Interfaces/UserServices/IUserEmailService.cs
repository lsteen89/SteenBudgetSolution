namespace Backend.Application.Interfaces.UserServices
{
    public interface IUserEmailService
    {
        Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email);
    }
}
