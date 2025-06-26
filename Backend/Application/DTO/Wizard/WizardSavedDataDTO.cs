using Backend.Contracts.Wizard;

namespace Backend.Application.DTO.Wizard
{
    public class WizardSavedDataDTO
    {
        public WizardData? WizardData { get; set; }
        public int? SubStep { get; set; }
        public int DataVersion { get; set; }
    }
}
