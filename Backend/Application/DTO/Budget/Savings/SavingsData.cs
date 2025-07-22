namespace Backend.Application.DTO.Budget.Savings
{
    public class SavingsData
    {
        public SavingsIntroDto? Intro { get; set; } // Not used in the backend, but included for completeness
        public SavingHabitsDto? Habits { get; set; } // Includes what user saves monthly and their saving methods
        public List<SavingsGoalDto>? Goals { get; set; } // List of savings goals, each with a name, target amount, amount saved, and target date
    }
}
