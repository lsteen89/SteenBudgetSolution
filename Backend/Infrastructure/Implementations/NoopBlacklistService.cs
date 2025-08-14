using Backend.Application.Abstractions.Infrastructure.Security;
using System.Data.Common;


namespace Backend.Infrastructure.Implementations
{
    public sealed class NoopBlacklistService : ITokenBlacklistService
    {
        public Task<bool> BlacklistTokenAsync(string jti, DateTime expiration, CancellationToken ct
                                                ) => Task.FromResult(true);

        public Task<bool> IsTokenBlacklistedAsync(string jti
                                                  ) => Task.FromResult(false);

        public Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct
                                                       ) => Task.FromResult(false);
    }
}
