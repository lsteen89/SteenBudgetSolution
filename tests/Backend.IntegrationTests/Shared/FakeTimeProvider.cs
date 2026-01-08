using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.IntegrationTests.Shared;

public sealed class FakeTimeProvider : ITimeProvider
{
    public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
    public DateTime UtcNow { get; }
}