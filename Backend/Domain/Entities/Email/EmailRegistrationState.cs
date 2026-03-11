namespace Backend.Domain.Entities.Email;

public sealed record EmailRegistrationState(bool Exists, bool EmailConfirmed);