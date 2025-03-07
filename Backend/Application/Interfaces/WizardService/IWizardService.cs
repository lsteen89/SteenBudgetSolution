using Backend.Application.DTO.Wizard;

namespace Backend.Application.Interfaces.WizardService
{
    public interface IWizardService
    {
        Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(string email);
        Task<bool> SaveStepDataAsync(string wizardSessionId, int stepNumber, object stepData);
        Task<Guid> UserHasWizardSessionAsync(string email);
        Task<Dictionary<int, object>?> GetWizardDataAsync(string wizardSessionId);
    }
}
