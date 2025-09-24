using MediatR;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Microsoft.Extensions.Options;
using Backend.Settings;
using Backend.Infrastructure.WebSockets;
using Backend.Domain.Shared;
using Backend.Domain.Users;
using Backend.Application.DTO.Auth;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Infrastructure.Security;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors.Helpers;

namespace Backend.Application.Features.Authentication.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthResult>>
{
    private const string DummyHash = "$2a$12$3v7iZz9K0wKQ9M3m8v6sUe7A1QWJ0rj3i4n0eQ9yHvsb8yT2t5m8a"; // precomputed bcrypt of "dummy"
    private readonly IUnitOfWork _uow;
    private readonly IRecaptchaService _recaptcha;
    private readonly IUserAuthenticationRepository _authz;
    private readonly IOptions<AuthLockoutOptions> _lockoutOpts;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshRepo;
    private readonly IJwtService _jwt;
    private readonly ITimeProvider _clock;
    private readonly IOptions<JwtSettings> _jwtSettings;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LoginCommandHandler> _log;
    private readonly WebSocketSettings _wsCfg;

    public LoginCommandHandler(
        IUnitOfWork uow,
        IRecaptchaService recaptcha,
        IUserAuthenticationRepository authz,
        IOptions<AuthLockoutOptions> lockoutOpts,
        IUserRepository users,
        IRefreshTokenRepository refreshRepo,
        IJwtService jwt,
        ITimeProvider clock,
        IOptions<JwtSettings> jwtSettings,
        IConfiguration configuration,
        ILogger<LoginCommandHandler> log,
        IOptions<WebSocketSettings> wsOpts
    )
    {
        _uow = uow; _recaptcha = recaptcha; _authz = authz; _lockoutOpts = lockoutOpts; _users = users;
        _refreshRepo = refreshRepo; _jwt = jwt; _clock = clock;
        _jwtSettings = jwtSettings; _configuration = configuration; _log = log;
        _wsCfg = wsOpts.Value;
    }

    public async Task<Result<AuthResult>> Handle(LoginCommand c, CancellationToken ct)
    {

        // 1) CAPTCHA
        var allowTestEmails = _configuration["ALLOW_TEST_EMAILS"] == "true";
        var isTestEmail = c.Email == _configuration["TestEmailAddress"]; // Also get the email from config!

        if (!(allowTestEmails && isTestEmail) && !await _recaptcha.ValidateTokenAsync(c.CaptchaToken))
        {
            return Result<AuthResult>.Failure(UserErrors.InvalidCaptcha);
        }

        // 2) Normalize + load + lockout
        var emailNorm = c.Email.Trim().ToLowerInvariant();
        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);

        var now = _clock.UtcNow;
        if (user?.LockoutUntil is DateTime until)
        {
            if (until > now)
            {
                _log.LogInformation("User locked until {Until}", until);
                return Result<AuthResult>.Failure(UserErrors.UserLockedOut);
            }
            await _authz.UnlockUserAsync(user.PersoId, ct); // expired → clear
        }

        // 3) Credentials (timing-safe)
        var since = now.AddMinutes(-_lockoutOpts.Value.WindowMinutes);
        bool passwordOk = user is not null && !string.IsNullOrEmpty(user.Password)
            ? BCrypt.Net.BCrypt.Verify(c.Password, user.Password)
            : BCrypt.Net.BCrypt.Verify(c.Password, DummyHash);

        var emailConfirmed = user?.EmailConfirmed ?? false;
        var isValid = user is not null && passwordOk && emailConfirmed;

        if (!isValid)
        {
            if (user is not null)
            {
                await _authz.InsertLoginAttemptAsync(user, c.Ip, c.UserAgent, now, ct);
                var fails = await _authz.CountFailedAttemptsSinceAsync(emailNorm, since, ct);
                if (fails >= _lockoutOpts.Value.MaxAttempts)
                    await _authz.LockUserByEmailAsync(emailNorm, now.AddMinutes(_lockoutOpts.Value.LockoutMinutes), ct);

                if (!user.EmailConfirmed)
                    return Result<AuthResult>.Failure(UserErrors.EmailNotConfirmed);
            }

            return Result<AuthResult>.Failure(UserErrors.InvalidCredentials);
        }

        if (string.IsNullOrWhiteSpace(user!.Email))
            return Result<AuthResult>.Failure(UserErrors.InvalidCredentials);

        IReadOnlyList<string> roles = new[] { "User" };

        try
        {
            // 4) Access token (creates SessionId)
            var at = _jwt.CreateAccessToken(user.PersoId, user.Email, roles, c.DeviceId, c.UserAgent);

            // 5) Hygiene: kill any leftovers for this session
            await _refreshRepo.RevokeSessionAsync(user.PersoId, at.SessionId, now, ct);

            // 6) Refresh token with clamp(rolling, absolute)
            var rolling = now + TimeSpan.FromDays(_jwtSettings.Value.RefreshTokenExpiryDays);
            var absolute = now.AddDays(_jwtSettings.Value.RefreshTokenExpiryDaysAbsolute);
            if (rolling > absolute) rolling = absolute; // CLAMP

            var plainRt = _jwt.CreateRefreshToken();
            var row = new RefreshJwtTokenEntity
            {
                TokenId = Guid.NewGuid(),
                Persoid = user.PersoId,
                SessionId = at.SessionId,
                HashedToken = TokenGenerator.HashToken(plainRt),
                AccessTokenJti = at.TokenJti,
                ExpiresRollingUtc = rolling,   // use the CLAMPED value
                ExpiresAbsoluteUtc = absolute,
                RevokedUtc = null,
                Status = TokenStatus.Active,
                IsPersistent = c.RememberMe,
                DeviceId = c.DeviceId,
                UserAgent = c.UserAgent,
                CreatedUtc = now
            };

            // 7) Persist (retry once on UNIQUE(HashedToken))
            try
            {
                var inserted = await _refreshRepo.InsertAsync(row, ct);
                if (inserted != 1) throw new InvalidOperationException("Failed to insert refresh token.");
            }
            catch (DuplicateKeyException)
            {
                plainRt = _jwt.CreateRefreshToken();
                var retryHash = TokenGenerator.HashToken(plainRt);
                row = new RefreshJwtTokenEntity
                {
                    TokenId = row.TokenId,
                    Persoid = row.Persoid,
                    SessionId = row.SessionId,
                    HashedToken = retryHash,
                    AccessTokenJti = row.AccessTokenJti,
                    ExpiresRollingUtc = row.ExpiresRollingUtc,
                    ExpiresAbsoluteUtc = row.ExpiresAbsoluteUtc,
                    RevokedUtc = row.RevokedUtc,
                    Status = row.Status,
                    IsPersistent = row.IsPersistent,
                    DeviceId = row.DeviceId,
                    UserAgent = row.UserAgent,
                    CreatedUtc = row.CreatedUtc
                };
                var inserted = await _refreshRepo.InsertAsync(row, ct);
                if (inserted != 1) throw;
            }

            // 8) Reset failed attempts (normalized email)
            await _authz.DeleteAttemptsByEmailAsync(emailNorm, ct);

            // 9) Result (UoW pipeline commits/rolls back)
            var wsMac = WebSocketAuth.MakeWsMac(user.PersoId, at.SessionId, _wsCfg.Secret);
            return Result<AuthResult>.Success(new AuthResult(at.Token, plainRt, user.PersoId, at.SessionId, wsMac, c.RememberMe));
        }
        catch (OperationCanceledException)
        {
            _log.LogWarning("Login cancelled.");
            throw;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Login failed.");
            throw;
        }
    }
}
