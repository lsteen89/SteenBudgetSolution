using MediatR;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.VerifyEmail;

/// <summary>
/// Represents the command to verify a user's email address using a token.
/// </summary>
public sealed record VerifyEmailCommand(Guid Token) : ICommand<Result>, ITransactionalCommand;