using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries
{
    public interface IAuthenticationSqlExecutor
    {
        Task<int> GetRecentFailedAttemptsAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null);
        Task LockUserAsync(string email, TimeSpan lockoutDuration, DbConnection? conn = null, DbTransaction? tx = null);
        Task UnlockUserAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null);
        Task RecordFailedLoginAsync(string email, string ipAddress, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> ShouldLockUserAsync(string email, DbConnection? conn = null, DbTransaction? tx = null);
        Task ResetFailedLoginAttemptsAsync(Guid persoId, DbConnection? conn = null, DbTransaction? tx = null);
        Task<bool> UpdatePasswordAsync(Guid persoId, string hashedPassword, DbConnection? conn = null, DbTransaction? tx = null);
    }
}
