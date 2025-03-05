namespace Backend.Application.DTO.Wizard.Steps
{
    public class StepBudgetInfoDto
    {
        // Required fields
        public decimal NetSalary { get; set; }
        public string SalaryFrequency { get; set; }
        public decimal YearlySalary { get; set; }

        // Optional collections: these will be cleared if their flags are false.
        public List<HouseholdMemberDto> HouseholdMembers { get; set; } = new();
        public List<SideHustleDto> SideHustles { get; set; } = new();
    }

    public class HouseholdMemberDto
    {
        public string Name { get; set; }
        public decimal? Income { get; set; } // nullable to handle empty strings/nulls.
        public string Frequency { get; set; }
        public decimal YearlyIncome { get; set; }
    }

    public class SideHustleDto
    {
        public string Name { get; set; }
        public decimal? Income { get; set; } // nullable in case of missing values.
        public string Frequency { get; set; }
        public decimal? YearlyIncome { get; set; }
    }

}
