using Backend.Domain.Shared;
using MediatR;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Authentication.ResetPassword;

public sealed record ResetPasswordCommand(
    string Email,
    string Code,
    string NewPassword,
    string ConfirmPassword
) : IRequest<Result>, ITransactionalCommand;