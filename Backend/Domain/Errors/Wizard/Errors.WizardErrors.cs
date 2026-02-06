using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Wizard;

public static partial class WizardErrors
{
    public static readonly Error WizardSessionNotFound = new("Wizard.SessionNotFound", "The specified wizard session was not found.");
    public static readonly Error WizardNoData = new("Wizard.NoData", "No wizard data found for the given session.");
}