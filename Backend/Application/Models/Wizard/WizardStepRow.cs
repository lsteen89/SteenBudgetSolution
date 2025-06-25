namespace Backend.Application.Models.Wizard
{
    public class WizardStepRow
    {
        public int StepNumber { get; set; }
        public int SubStep { get; set; }
        public string StepData { get; set; }
        public int DataVersion { get; set; }
    }
}
