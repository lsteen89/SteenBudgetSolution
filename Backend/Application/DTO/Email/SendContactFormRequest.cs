using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Email;

public sealed class SendContactFormRequest
{
    public string SenderEmail { get; init; } = default!;
    public string Subject { get; init; } = default!;
    public string Body { get; init; } = default!;
    public string CaptchaToken { get; init; } = default!;

    public string? FirstName { get; init; }
    public string? LastName { get; init; }
}