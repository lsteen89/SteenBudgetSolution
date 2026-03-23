using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Support.Contact;

public sealed record SendSupportMessageCommand(
    Guid Persoid,
    string Subject,
    string Body,
    string? Category,
    string? IpAddress,
    string? UserAgent
) : ICommand<Result>, ITransactionalCommand;