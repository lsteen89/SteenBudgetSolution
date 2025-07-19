using Backend.Application.DTO.Budget.Savings;
using Backend.Domain.Entities.Budget.Savings;

namespace Backend.Application.Mapping.Budget
{
    public static class SavingsMapping
    {
        public static Savings ToDomain(this SavingsData dto, Guid budgetId)
        {
            var savings = new Savings
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                SavingHabit = dto.Intro?.SavingHabit,
                MonthlySavings = dto.Habits?.MonthlySavings ?? 0,
                SavingMethods = dto.Habits?.SavingMethods?.ToList() ?? new List<string>(),
                SavingsGoals = dto.Goals?.Select(g => g.ToDomain()).ToList() ?? new List<SavingsGoal>()
            };

            foreach (var goal in savings.SavingsGoals)
            {
                goal.SavingsId = savings.Id;
            }

            return savings;
        }

        private static SavingsGoal ToDomain(this SavingsGoalDto dto)
        {
            return new SavingsGoal
            {
                Id = Guid.TryParse(dto.Id, out var id) ? id : Guid.NewGuid(),
                Name = dto.Name,
                TargetAmount = dto.TargetAmount,
                AmountSaved = dto.AmountSaved,
                TargetDate = DateTime.TryParse(dto.TargetDate, out var date) ? date : null
            };
        }
    }

}
