using System.ComponentModel.DataAnnotations;

// summary: Represents options for verification token settings.
namespace Backend.Application.Options.Auth;
public sealed class VerificationTokenOptions
{
    [Range(1, 168)]                 // 1 hour – 7 days
    public int TtlHours { get; init; } = 24;
}
