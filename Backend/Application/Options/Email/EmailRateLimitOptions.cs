using System.ComponentModel.DataAnnotations;

namespace Backend.Application.Options.Email;

public sealed class EmailRateLimitOptions
{
    [Range(1, 10_000)] public int DailyLimit { get; init; } = 5;
    [Range(1, 24 * 60)] public int CooldownPeriodMinutes { get; init; } = 10;
    [Range(1, 365)] public int RetentionDays { get; init; } = 60; // cleanup horizon
}