using MediatR;
using Backend.Domain.Shared;
using Backend.Domain.Users;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.VerifyEmail;


public sealed class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, Result>, ITransactionalCommand
{
    private readonly IVerificationTokenRepository _tokens;
    private readonly IUserRepository _users;
    private readonly ITimeProvider _clock;
    private readonly ILogger<VerifyEmailCommandHandler> _log;

    public VerifyEmailCommandHandler(
        IVerificationTokenRepository tokens,
        IUserRepository users,
        ITimeProvider clock,
        ILogger<VerifyEmailCommandHandler> log)
    { _tokens = tokens; _users = users; _clock = clock; _log = log; }

    public async Task<Result> Handle(VerifyEmailCommand request, CancellationToken ct)
    {
        var now = _clock.UtcNow;

        // 1) Fetch token
        var tok = await _tokens.GetByTokenAsync(request.Token, ct);
        if (tok is null || tok.TokenExpiryDate < now)
        {
            _log.LogInformation("Invalid/expired verification token");
            return Result.Failure(UserErrors.VerificationTokenNotFound);
        }

        // 2) Load user
        var user = await _users.GetUserModelAsync(persoid: tok.PersoId, ct: ct);
        if (user is null)
        {
            _log.LogError("Valid token but missing user. PersoId {PersoId}", tok.PersoId);
            return Result.Failure(UserErrors.VerificationTokenNotFound);
        }

        // 3) Already verified?
        if (user.EmailConfirmed)
            return Result.Failure(UserErrors.EmailAlreadyVerified);

        // 4) Confirm (only if not already confirmed)
        var ok = await _users.ConfirmUserEmailAsync(user.PersoId, ct);
        if (!ok)
        {
            _log.LogError("Failed to confirm email for PersoId {PersoId}", user.PersoId);
            return Result.Failure(UserErrors.VerificationUpdateFailed);
        }

        // 5) Delete tokens for this user (safer than by-token)
        await _tokens.DeleteAllForUserAsync(user.PersoId, ct);

        _log.LogInformation("Email verified for PersoId {PersoId}", user.PersoId);
        return Result.Success();
    }

}