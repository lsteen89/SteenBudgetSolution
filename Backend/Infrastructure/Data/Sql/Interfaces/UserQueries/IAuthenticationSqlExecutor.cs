namespace Backend.Infrastructure.Data.Sql.Interfaces.UserQueries
{
    public interface IAuthenticationSqlExecutor
    {
        Task<int> GetRecentFailedAttemptsAsync(Guid persoId);
        Task LockUserAsync(string email, TimeSpan lockoutDuration);
        Task UnlockUserAsync(Guid persoId);
        Task RecordFailedLoginAsync(string email, string ipAddress);
        Task<bool> ShouldLockUserAsync(string email);
        Task ResetFailedLoginAttemptsAsync(Guid persoId);
        Task<bool> UpdatePasswordAsync(Guid persoId, string hashedPassword);
    }
}
