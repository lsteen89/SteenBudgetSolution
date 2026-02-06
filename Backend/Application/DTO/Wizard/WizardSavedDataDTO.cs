using Backend.Application.Models.Wizard;

namespace Backend.Application.DTO.Wizard
{
    public sealed record WizardSavedDataDto(
        WizardData WizardData,
        WizardProgressDto Progress,
        int DataVersion
    );

    public sealed record WizardProgressDto(
        int MajorStep,
        int SubStep,
        IReadOnlyDictionary<int, int> MaxSubStepByMajor
    );
}
