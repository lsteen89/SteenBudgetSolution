using Backend.Application.Interfaces.JWT;
using System.Data.Common;


namespace Backend.Infrastructure.Implementations
{
    public sealed class NoopBlacklistService : ITokenBlacklistService
    {
        public Task<bool> BlacklistTokenAsync(string jti, DateTime expiration, DbConnection conn, DbTransaction tx
                                                ) => Task.FromResult(true);

        public Task<bool> IsTokenBlacklistedAsync(string jti
                                                  ) => Task.FromResult(false);

        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti
                                                       ) => Task.FromResult(false);
    }
}
