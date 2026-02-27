using Backend.Domain.Entities.User;

namespace Backend.Application.Features.Authentication.Register.Shared.Models;

public sealed record RegistrationOutcome(
    bool IsHoneypot,
    UserModel? User
);