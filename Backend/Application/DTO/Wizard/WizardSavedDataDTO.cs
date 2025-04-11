namespace Backend.Application.DTO.Wizard
{
    public class WizardSavedDataDTO
    {
        public Dictionary<int, object>? WizardData { get; set; }
        public int SubStep { get; set; }
    }
}
