
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Contact;

public sealed record SendContactFormCommand(
    string Subject,
    string Body,
    string SenderEmail,
    string CaptchaToken,
    string? IpAddress = null,
    string? UserAgent = null
) : ICommand<Result>, ITransactionalCommand;