using Backend.Application.Features.Authentication.ResetPassword.Orchestrator;
using MediatR;
using Backend.Application.Abstractions.Application.Orchestrators;

namespace Backend.Application.Features.Authentication.ForgotPassword;

public sealed class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand>
{
    private readonly IPasswordResetOrchestrator _passwordReset;

    public ForgotPasswordCommandHandler(IPasswordResetOrchestrator passwordReset)
    {
        _passwordReset = passwordReset;
    }

    public Task Handle(ForgotPasswordCommand request, CancellationToken ct) =>
        _passwordReset.RequestResetAsync(request.Email, request.Locale, ct);
}