using MediatR;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Authentication.ForgotPassword;

public sealed record ForgotPasswordCommand(
    string Email,
    string? Locale
) : IRequest, ITransactionalCommand;