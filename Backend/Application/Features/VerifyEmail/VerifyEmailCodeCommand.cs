using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.VerifyEmail;

public sealed record VerifyEmailCodeCommand(string Email, string Code)
    : ICommand<Result>, ITransactionalCommand;
