using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Commands.Auth.Register;

/// <summary>
/// Command to register a new user.
/// </summary>
/// <param name="FirstName">The first name of the user.</param>
/// <param name="LastName">The last name of the user.</param>
/// <param name="Email">The email address of the user.</param>
/// <param name="Password">The password for the user account.</param>

public record RegisterUserCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string CaptchaToken,
    string? Honeypot
) : ICommand<Result>, ITransactionalCommand
{
    public bool IsSeedingOperation { get; init; } = false;
}