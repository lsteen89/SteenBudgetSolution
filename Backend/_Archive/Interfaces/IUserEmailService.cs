namespace Backend.Application.Interfaces.UserServices
{
    [Obsolete("This interface is deprecated and will be removed in future versions. Use IUserRepository instead.")]
    public interface IUserEmailService
    {
        Task<(bool IsSuccess, int StatusCode, string Message)> ResendVerificationEmailAsync(string email);
    }
}
