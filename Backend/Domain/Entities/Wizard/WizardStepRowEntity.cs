// Represents a row in the wizard step table
namespace Backend.Domain.Entities.Wizard
{
    public class WizardStepRowEntity
    {
        public Guid WizardSessionId { get; set; } // Unique identifier for the wizard session Char (36)
        public int StepNumber { get; set; } // Step number of the wizard step Int (11)
        public int SubStep { get; set; } // Substep number of the wizard step Int (11)
        public string StepData { get; set; } // JSON data for the step String (max length 65535)
        public int DataVersion { get; set; } // Version of the wizard data
        public DateTime UpdatedAt { get; set; } // Timestamp of the last update UTC_TIMESTAMP() (DATETIME)
    }
}
