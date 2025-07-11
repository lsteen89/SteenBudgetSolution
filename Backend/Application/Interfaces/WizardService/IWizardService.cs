﻿using Backend.Application.DTO.Wizard;

namespace Backend.Application.Interfaces.WizardService
{
    public interface IWizardService
    {
        Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(Guid persoid);
        Task<bool> SaveStepDataAsync(string wizardSessionId, int stepNumber, int substepNumber, object stepData, int dataVersion);
        Task<Guid> UserHasWizardSessionAsync(Guid? persoid);
        Task<WizardSavedDataDTO> GetWizardDataAsync(string wizardSessionId);
        Task<int> GetWizardSubStep(string wizardSessionId);
        Task<bool> GetWizardSessionAsync(string wizardSessionId);
    }
}
