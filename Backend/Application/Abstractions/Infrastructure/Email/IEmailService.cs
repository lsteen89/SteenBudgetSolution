namespace Backend.Application.Abstractions.Infrastructure.Email;

public record EmailSendResult(bool Success, string? ProviderId, string? Error);

public interface IEmailService
{
    Task<EmailSendResult> SendEmailAsync(IEmailComposer composer, CancellationToken ct);
}