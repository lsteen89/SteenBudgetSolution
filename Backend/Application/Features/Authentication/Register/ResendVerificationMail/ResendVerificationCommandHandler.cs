using MediatR;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Common.Behaviors;
using Backend.Application.Abstractions.Application.Orchestrators;

namespace Backend.Application.Features.Authentication.Register.ResendVerificationMail;

public sealed class ResendVerificationCommandHandler
    : IRequestHandler<ResendVerificationCommand, Result>, ITransactionalCommand
{
    private static readonly TimeSpan ReuseIfRemaining = TimeSpan.FromMinutes(5);

    private readonly IUserRepository _users;
    private readonly IVerificationTokenRepository _tokens;
    private readonly IVerificationCodeOrchestrator _verificationOrchestrator;
    private readonly ILogger<ResendVerificationCommandHandler> _log;

    public ResendVerificationCommandHandler(
        IUserRepository users,
        IVerificationTokenRepository tokens,
        IVerificationCodeOrchestrator verificationOrchestrator,

        ILogger<ResendVerificationCommandHandler> log)
    {
        _users = users; _tokens = tokens;
        _verificationOrchestrator = verificationOrchestrator;
        _log = log;
    }

    public async Task<Result> Handle(ResendVerificationCommand cmd, CancellationToken ct)
    {
        var emailNorm = cmd.Email.Trim().ToLowerInvariant();

        var user = await _users.GetUserModelAsync(email: emailNorm, ct: ct);

        if (user is null || user.EmailConfirmed) return Result.Success(); // no enumeration

        var preferences = await _users.GetUserPreferencesAsync(user.PersoId, ct);
        var locale = preferences?.Locale ?? "sv-SE";

        await _verificationOrchestrator.EnqueueForResendAsync(
            user.PersoId,
            emailNorm,
            locale,
            ct);

        return Result.Success(); // always
    }
}