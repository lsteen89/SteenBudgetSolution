using MediatR;
using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Authentication.ResetPassword;

public sealed class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, Result>
{
    private readonly IPasswordResetOrchestrator _passwordReset;

    public ResetPasswordCommandHandler(IPasswordResetOrchestrator passwordReset)
    {
        _passwordReset = passwordReset;
    }

    public Task<Result> Handle(ResetPasswordCommand request, CancellationToken ct) =>
        _passwordReset.ResetAsync(request.Email, request.Code, request.NewPassword, ct);
}