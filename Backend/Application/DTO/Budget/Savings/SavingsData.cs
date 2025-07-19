namespace Backend.Application.DTO.Budget.Savings
{
    public class SavingsData
    {
        public SavingsIntroDto? Intro { get; set; }
        public SavingHabitsDto? Habits { get; set; }
        public List<SavingsGoalDto>? Goals { get; set; }
    }
}
