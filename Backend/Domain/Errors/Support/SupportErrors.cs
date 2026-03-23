using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Support;

public static class SupportErrors
{
    public static readonly Error ValidationFailed =
        new("Support.ValidationFailed", "The support message is invalid.");

    public static readonly Error UserNotFound =
        new("Support.UserNotFound", "The user could not be found.");

    public static readonly Error QueueFailed =
        new("Support.QueueFailed", "The support message could not be queued.");
}