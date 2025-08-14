using Backend.Application.DTO.Budget.Savings;
using Backend.Domain.Entities.Budget.Savings;

namespace Backend.Application.Mappings.Budget
{
    public static class SavingsMapping
    {
        public static Savings ToDomain(this SavingsData dto, Guid budgetId)
        {
            var savings = new Savings
            {
                BudgetId = budgetId,
                // Get the monthly amount from the single habits object.
                MonthlySavings = dto.Habits?.MonthlySavings ?? 0
            };

            // --- Map the Methods ---
            // If the habits object exists, and its list of methods exists...
            if (dto.Habits?.SavingMethods is { Length: > 0 })
            {
                // ...loop through the array of strings...
                foreach (var methodString in dto.Habits.SavingMethods)
                {
                    // ...and for EACH string, create a new SavingsMethod object and add it.
                    savings.AddMethod(new SavingsMethod { Method = methodString });
                }
            }

            // --- Map the Goals ---
            if (dto.Goals is not null)
            {
                foreach (var goalDto in dto.Goals)
                {
                    savings.AddGoal(goalDto.ToDomain()); // Assumes a ToDomain for SavingsGoalDto
                }
            }

            return savings;
        }

        // Helper mapper for a single goal
        private static SavingsGoal ToDomain(this SavingsGoalDto dto)
        {
            return new SavingsGoal
            {
                Name = dto.Name,
                TargetAmount = dto.TargetAmount,
                AmountSaved = dto.AmountSaved,
                TargetDate = dto.TargetDate
            };
        }
    }
}
