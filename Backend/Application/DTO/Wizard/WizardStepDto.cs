namespace Backend.Application.DTO.Wizard
{
    public sealed class WizardStepDto
    {
        public object StepData { get; set; } = default!;
        public int DataVersion { get; set; }
    }
}
