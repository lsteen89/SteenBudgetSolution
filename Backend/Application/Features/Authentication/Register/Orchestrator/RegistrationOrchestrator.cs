using Backend.Domain.Entities.User;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using Backend.Domain.Errors.User;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Application.Features.Authentication.Register.Shared.Models;
using Backend.Application.Validators.Locale;

namespace Backend.Application.Features.Authentication.Register.Orchestrator;

public sealed class RegistrationOrchestrator : IRegistrationOrchestrator
{
    private readonly IUserRepository _users;
    private readonly ITurnstileService _turnstile;
    private readonly IVerificationCodeOrchestrator _verification;
    private readonly ILogger<RegistrationOrchestrator> _log;

    public RegistrationOrchestrator(
        IUserRepository users,
        ITurnstileService turnstile,
        IVerificationCodeOrchestrator verification,
        ILogger<RegistrationOrchestrator> log)
    {
        _users = users;
        _turnstile = turnstile;
        _verification = verification;
        _log = log;
    }

    public async Task<Result<RegistrationOutcome>> RegisterAsync(
        string firstName,
        string lastName,
        string email,
        string password,
        string humanToken,
        string honeypot,
        string locale,
        string? remoteIp,
        bool trustedSeed,
        CancellationToken ct)
    {
        var emailNorm = email.Trim().ToLowerInvariant();

        // Honeypot: pretend success, no side effects
        if (!trustedSeed && !string.IsNullOrWhiteSpace(honeypot))
            return Result<RegistrationOutcome>.Success(new RegistrationOutcome(IsHoneypot: true, User: null));

        // Turnstile
        if (!trustedSeed)
        {
            var ok = await _turnstile.ValidateAsync(humanToken, remoteIp: remoteIp, ct);
            if (!ok)
                return Result<RegistrationOutcome>.Failure(UserErrors.InvalidChallengeToken);
        }

        if (await _users.UserExistsAsync(emailNorm, ct))
            return Result<RegistrationOutcome>.Failure(UserErrors.EmailAlreadyExists);

        var safeLocale = UserLocale.Normalize(locale);

        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            Email = emailNorm,
            Password = BCrypt.Net.BCrypt.HashPassword(password),
            Roles = "1",
            EmailConfirmed = trustedSeed
        };

        var success = await _users.CreateUserAsync(user, ct);
        if (!success) return Result<RegistrationOutcome>.Failure(UserErrors.RegistrationFailed);


        var settingsOk = await _users.UpsertUserSettingsAsync(user.PersoId, safeLocale, ct);
        if (!settingsOk) return Result<RegistrationOutcome>.Failure(UserErrors.RegistrationFailed);

        if (!trustedSeed)
            await _verification.EnqueueForNewUserAsync(user.PersoId, user.Email, safeLocale, ct);

        return Result<RegistrationOutcome>.Success(new RegistrationOutcome(IsHoneypot: false, User: user));
    }
}