using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.ResendVerification;

/// <summary>
/// Represents the command to resend a verification email to a user.
/// </summary>
public sealed record ResendVerificationCommand(string Email) : ICommand<Result>, ITransactionalCommand;