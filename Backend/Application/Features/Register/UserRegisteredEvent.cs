using MediatR;

namespace Backend.Application.Features.Events.Register;

public sealed record UserRegisteredEvent(Guid UserId, string Email) : INotification;