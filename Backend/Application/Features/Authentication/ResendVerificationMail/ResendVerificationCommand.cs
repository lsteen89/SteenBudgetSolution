using MediatR;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Commands.Auth.ResendVerification;

/// <summary>
/// Represents the command to resend a verification email to a user.
/// </summary>
public sealed record ResendVerificationCommand(string Email) : ICommand<Result>;