namespace Backend.Application.Interfaces.WizardService
{
    public interface IWizardService
    {
        Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(string email);
        Task<Guid> UserHasWizardSessionAsync(string email);
    }
}
