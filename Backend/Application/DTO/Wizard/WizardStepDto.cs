namespace Backend.Application.DTO.Wizard
{
    public class WizardStepDto
    {
        public string WizardSessionId { get; set; }
        public object StepData { get; set; }
        public int subStepNumber { get; set; }
        public int DataVersion { get; set; }

    }
}
