namespace Backend.Application.Models.Auth;

public sealed record PasswordResetCodeRecord(
    Guid Id,
    Guid UserId,
    string Email,
    string CodeHash,
    DateTime ExpiresAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UsedAtUtc,
    DateTime? InvalidatedAtUtc
);