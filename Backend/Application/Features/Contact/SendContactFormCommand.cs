
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Contact;

public sealed record SendContactFormCommand(
    string Subject,
    string Body,
    string SenderEmail,
    string CaptchaToken,
    string? IpAddress = null,
    string? UserAgent = null
) : ICommand<Result>;