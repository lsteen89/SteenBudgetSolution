using Backend.Application.Models.Auth;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IPasswordResetRepository
{
    Task CreateAsync(PasswordResetCodeRecord record, CancellationToken ct);
    Task<PasswordResetCodeRecord?> GetActiveByEmailAsync(string email, CancellationToken ct);
    Task InvalidateActiveCodesForUserAsync(Guid userId, CancellationToken ct);
    Task MarkUsedAsync(Guid resetId, CancellationToken ct);
}