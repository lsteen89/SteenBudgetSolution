//This class is a orchestrator for the authentication process.
//It handles the login, refresh token and logout processes.
//
//It also uses the TokenGenerator class to hash the refresh token and generate a new one.


using Backend.Application.Common.Security;
using Backend.Application.DTO.Auth;
using Backend.Application.DTO.User;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Mappers;
using Backend.Application.Models.Token;
using Backend.Common.Interfaces;
using Backend.Common.Utilities;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.Security;
using Backend.Settings;
using System.Data.Common;
using Backend.Application.Helpers.Jwt;
using Backend.Infrastructure.WebSockets;
using MySqlConnector;

namespace Backend.Application.Services.AuthService
{
    public class AuthService : SqlBase, IAuthService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IUserAuthenticationService _userAuthenticationService;
        private readonly IUserSQLProvider _userSQLProvider;
        private readonly IJwtService _jwtService;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IUserTokenService _userTokenService;
        private readonly IWebSocketManager _webSocketManager;
        private readonly ITimeProvider _timeProvider;
        private readonly ITransactionRunner _tx;
        private readonly TimeSpan _refreshWindow;
        private readonly IEnvironmentService _environmentService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            JwtSettings jwtSettings,
            IConnectionFactory connectionFactory,
            IUserAuthenticationService userAuthenticationService,
            IUserSQLProvider userSQLProvider,
            IJwtService jwtService,
            IRecaptchaService recaptchaService,
            IUserTokenService userTokenService,
            IWebSocketManager webSocketManager,
            ITimeProvider timeProvider,
            ITransactionRunner txRunner,
            IEnvironmentService environmentService,
            ILogger<AuthService> logger
        )
            : base(connectionFactory, logger) 
        {
            _jwtSettings = jwtSettings;
            _userAuthenticationService = userAuthenticationService;
            _userSQLProvider = userSQLProvider;
            _jwtService = jwtService;
            _recaptchaService = recaptchaService;
            _userTokenService = userTokenService;
            _webSocketManager = webSocketManager;
            _timeProvider = timeProvider;
            _tx = txRunner;
            _environmentService = environmentService;
            _logger = logger;
            _refreshWindow = TimeSpan.FromDays(_jwtSettings.RefreshTokenExpiryDays);
        }

        #region Login/Logout
        public async Task<LoginOutcome> LoginAsync(
                UserLoginDto dto, string ip, string deviceId, string ua
                //CancellationToken ct = default TODO - implement this
            )
        {
            /* 1 ─ CAPTCHA */
            // Allow test emails to bypass CAPTCHA validation with a specific environment variable.
            bool isTest = Environment.GetEnvironmentVariable("ALLOW_TEST_EMAILS") == "true"
                          && dto.Email == "l@l.se";
            bool captchaOk = isTest || await _recaptchaService.ValidateTokenAsync(dto.CaptchaToken);
            if (!captchaOk)
                return new LoginOutcome.Fail("Invalid CAPTCHA.");

            /* 2 ─ lock-out */
            if (await _userAuthenticationService.CheckLoginAttemptsAsync(dto.Email))
                return new LoginOutcome.Fail("User is locked out. Contact support.");

            /* 3 ─ credentials */
            var cred = await _userAuthenticationService.ValidateCredentialsAsync(dto.Email, dto.Password);
            if (!cred.IsValid)
            {
                await _userAuthenticationService.HandleFailedLoginAsync(dto, ip);
                return new LoginOutcome.Fail(cred.ErrorMessage);
            }

            /* 4 ─ user + roles (placeholder) */
            var user = await _userSQLProvider.UserSqlExecutor.GetUserModelAsync(email: dto.Email);
            var roles = new List<string> { "User" };

            /* 5 ─ access-token */
            var access = await _jwtService.CreateAccessTokenAsync(
                             user.PersoId, user.Email, roles, deviceId, ua);

            /* 6 ─ refresh-token */
            var ctx = new UserCtx(user.PersoId, access.SessionId, deviceId, ua, user.Email, roles);
            var (refreshTok, _, _) = await IssueAsync(ctx, access.TokenJti, dto.RememberMe);

            /* 7 ─ reset failures */
            await ResetFailedLoginAttempts(user.PersoId, dto.Email);

            return new LoginOutcome.Success(access, refreshTok, user.PersoId, dto.RememberMe);
        }
        public async Task LogoutAsync(string accessToken, string refreshToken, Guid sessionId, bool logoutAllUsers)
        {
            _logger.LogInformation("Processing logout request.");

            _logger.LogDebug("Logout request details: AccessToken: {AccessToken}, RefreshToken: {RefreshToken}, SessionId: {SessionId}, LogoutAllUsers: {LogoutAllUsers}", accessToken, refreshToken, sessionId, logoutAllUsers);

            var persoid = TokenHelper.GetUserIdFromToken(accessToken);
            _logger.LogDebug("Logout: found persoid: {Persoid} in token", persoid);
            // 2. Use a transaction for DB operations.
            // The result of this _tx.ExecuteAsync call will be a bool.
            // We'll capture it, but the LogoutAsync method itself might not use it directly.
            bool allDbOpsSuccess = await _tx.ExecuteAsync<bool>(async (conn, tx) =>
            {
                bool overallDbSuccess = true; // Assume success initially

                // Blacklist the access token. (DB)
                bool blacklistSuccess = await _jwtService.BlacklistJwtTokenAsync(accessToken, conn, tx);
                if (!blacklistSuccess)
                {
                    _logger.LogWarning("Error blacklisting access token for user {UserId}", persoid);
                    overallDbSuccess = false; // Mark as failed if blacklisting fails
                }

                // Handle refresh tokens. (DB)
                if (logoutAllUsers)
                {
                    var deleteSuccess = await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokensByUserIdAsync(persoid, conn, tx);
                    if (!deleteSuccess)
                    {
                        _logger.LogWarning("Error deleting all refresh tokens for user {UserId}", persoid);
                        overallDbSuccess = false; // Mark as failed if deletion fails
                    }
                }
                else
                {
                    var providedHashedToken = TokenGenerator.HashToken(refreshToken);
                    if (!string.IsNullOrEmpty(refreshToken))
                    {
                        bool deleteSuccess = await _userSQLProvider.RefreshTokenSqlExecutor.DeleteTokenAsync(providedHashedToken, conn, tx);
                        if (!deleteSuccess)
                        {
                            _logger.LogWarning("Error deleting refresh token for session {SessionId}. Token: {TokenHash}", sessionId, providedHashedToken);
                            overallDbSuccess = false; // Mark as failed if deletion fails
                        }
                    }
                }
                return overallDbSuccess;
            }); // Transaction ends here

            _logger.LogDebug("Database operations in LogoutAsync completed successfully: {Success}", allDbOpsSuccess);

            // Send WebSocket message
            var targetUserSession = new UserSessionKey(persoid, sessionId);
            await _webSocketManager.SendMessageAsync(targetUserSession, "LOGOUT");
            _logger.LogInformation($"Sent LOGOUT message to user {persoid}: SessionId: {sessionId} via WebSocket.");
        }
        #endregion

        #region RefreshToken
        public async Task<AuthStatusResult> CheckAndRefreshAsync(
            string? accessToken,
            string refreshCookie,
            Guid sessionId,
            string userAgent,
            string deviceId,
            DbConnection conn,
            DbTransaction tx)
        {
            var now = _timeProvider.UtcNow;

            /* ── 1. quick rejects ───────────────────────────────────────────── */
            if (string.IsNullOrWhiteSpace(refreshCookie) || sessionId == Guid.Empty)
                return AuthStatusResult.Fail();

            /* ── 2. load current RT row (FOR UPDATE) ────────────────────────── */
            var storedToken = await GetRefreshTokenDB(
                    refreshCookie, sessionId, onlyActive: true, conn, tx);

            if (storedToken is null || storedToken.SessionId != sessionId)
                return AuthStatusResult.Fail();

            if (now > storedToken.ExpiresAbsoluteUtc)
                return AuthStatusResult.Fail();

            /* ── 3. user & roles ────────────────────────────────────────────── */
            var user = await _userSQLProvider.UserSqlExecutor
                                .GetUserModelAsync(persoid: storedToken.Persoid);
            var roles = new List<string?> { "User" };                // TODO real roles

            /* ── 4. rotation – ──────────────────────────────────────────────── */
            string newRefresh;
            DateTime newRolling;
            AccessTokenResult newAccess;

            try
            {
                /* 4-a) Create new accesstoken for upsert */
                newAccess = await _jwtService.CreateAccessTokenAsync(
                    storedToken.Persoid, user.Email, roles, deviceId, userAgent, sessionId: sessionId);

                /* 4-a) UPSERT *new* RT */
                (newRefresh, var newTokenId, newRolling) = await UpsertRefreshTokenAsync(
                    new UserCtx(storedToken.Persoid, sessionId, deviceId,
                                userAgent, user.Email, roles),
                    jti: newAccess.TokenJti,
                    rememberMe: storedToken.IsPersistent,
                    rollingWindow: _refreshWindow,
                    absDays: _jwtSettings.RefreshTokenExpiryDaysAbsolute,
                    jwt: _jwtService,
                    clock: _timeProvider,
                    conn, tx);

                /* 4-c) Blacklist the *old* AT */
                // It's okay if this fails for an already-expired token. The blacklist is to
                // immediately invalidate non-expired tokens (e.g., on logout). Expired tokens
                // are already invalid.
                if (!string.IsNullOrEmpty(accessToken))
                {
                    if (!await _jwtService.BlacklistJwtTokenAsync(accessToken, conn, tx))
                    {
                        _logger.LogWarning("Could not blacklist the old access token for session {SessionId}. This is expected if the token was already expired.", sessionId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unexpected error during refresh for {User}/{Session}", storedToken.Persoid, sessionId);
                return AuthStatusResult.Fail();
            }

            /* ── 5. winner returns brand-new tokens ─────────────────────────── */
            return AuthStatusResult.Success(newAccess.Token, newAccess.SessionId, user.PersoId, newRolling, storedToken.IsPersistent, newRefresh);
        }


        /*
         *  Refresh token methods.
         *  Entry point for issuing a new refresh token. 
         *  This is called by the login, it helps with creating a transaction. 
         *  
         
         *  NOTE  
         *  This is already done in the refreshflow, since its a bigger transaction.
         */

        public Task<(string token, Guid tokenId, DateTime exp)> IssueAsync(UserCtx ctx, string jti, bool rememberMe) =>
            ExecuteInTransactionAsync((c, tx) =>
                UpsertRefreshTokenAsync(ctx, jti, rememberMe,
                              _refreshWindow, _jwtSettings.RefreshTokenExpiryDaysAbsolute,
                              _jwtService, _timeProvider, c, tx));
        // PRIVATE – Must be called in a transaction
        private static async Task<(string token, Guid tokenId, DateTime rollingExp)> UpsertRefreshTokenAsync(
                UserCtx ctx,
                string jti,
                bool rememberMe,
                TimeSpan rollingWindow,
                int absDays,
                IJwtService jwt,
                ITimeProvider clock,
                DbConnection conn,
                DbTransaction tx
            )
        {
            string token = await jwt.CreateRefreshToken();
            DateTime now = clock.UtcNow;
            DateTime rolling = now + rollingWindow;
            DateTime abs = now.AddDays(absDays);

            var row = new RefreshJwtTokenEntity
            {
                TokenId = Guid.NewGuid(),
                HashedToken = TokenGenerator.HashToken(token),
                AccessTokenJti = jti,
                Persoid = ctx.Persoid,
                SessionId = ctx.SessionId,
                DeviceId = ctx.DeviceId,
                UserAgent = ctx.UserAgent,
                ExpiresRollingUtc = rolling,
                ExpiresAbsoluteUtc = abs,
                Status = TokenStatus.Active,
                IsPersistent = rememberMe,
            };

            bool inserted = await jwt.UpsertRefreshTokenAsync(row, conn, tx);
            if (!inserted)               
                throw new InvalidOperationException("Could not upsert!");
            return (token, row.TokenId, rolling);
        }

        private async Task<JwtRefreshTokenModel?> GetRefreshTokenDB(string refreshToken, Guid sessionId, bool onlyActive, DbConnection conn, DbTransaction tx)
        {
            if (string.IsNullOrEmpty(refreshToken))
            {
                throw new ArgumentException("Refresh token cannot be null or empty");
            }
            var providedHashedToken = TokenGenerator.HashToken(refreshToken);
            var storedTokens = await _userSQLProvider.RefreshTokenSqlExecutor.GetRefreshTokensAsync(conn, tx, hashedToken: providedHashedToken, sessionId: sessionId, onlyActive: onlyActive);
            var storedToken = storedTokens.FirstOrDefault(); // At this stage, we only expect one token
            if (storedToken == null)
            {
                _logger.LogWarning("No refresh token record found for sessionid: {SessionId} during lookup for refreshtoken: {Refreshtoken}.", sessionId, providedHashedToken);
                return null;
            }
            // Convert it before returning
            var mappedToken = RefreshTokenMapper.ToDomain(storedToken);

            return mappedToken;
        }
        #endregion
        private async Task ResetFailedLoginAttempts(Guid persoId, string email)
        {
            try
            {
                await _userSQLProvider.AuthenticationSqlExecutor.ResetFailedLoginAttemptsAsync(persoId);
                _logger.LogInformation("Failed login attempts reset for user: {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting failed login attempts for user: {MaskedEmail}", LogHelper.MaskEmail(email));
            }
        }
    }
}
