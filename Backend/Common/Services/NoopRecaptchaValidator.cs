

namespace Backend.Application.Abstractions.Infrastructure.Security;

public sealed class NoopRecaptchaValidator : IRecaptchaService
{
    public Task<bool> ValidateTokenAsync(string token)
        => Task.FromResult(true);
}