using Backend.Application.DTO.Wizard;

namespace Backend.Application.Interfaces.WizardService
{
    public interface IWizardService
    {
        Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(Guid persoid);
        Task<bool> SaveStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, object stepData, int dataVersion);
        Task<Guid> UserHasWizardSessionAsync(Guid? persoid);
        Task<WizardSavedDataDTO> GetWizardDataAsync(Guid wizardSessionId);
        Task<int> GetWizardSubStep(Guid wizardSessionId);
        Task<bool> GetWizardSessionAsync(Guid wizardSessionId);
    }
}
