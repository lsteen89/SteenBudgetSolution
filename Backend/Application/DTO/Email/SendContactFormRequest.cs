using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Email;

public sealed class SendContactFormRequest
{
    [Required, EmailAddress, MaxLength(320)]
    public string SenderEmail { get; init; } = default!;

    [Required, MaxLength(200)]
    public string Subject { get; init; } = default!;

    [Required, MaxLength(4000)]
    public string Body { get; init; } = default!;

    [Required]
    public string CaptchaToken { get; init; } = default!;

    // Keep only if you use them in the email body/display:
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
}