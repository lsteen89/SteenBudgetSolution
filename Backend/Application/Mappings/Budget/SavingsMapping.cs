
using Backend.Application.DTO.Budget.Savings;
using Backend.Domain.Entities.Budget.Savings;

namespace Backend.Application.Mappings.Budget
{
    public static class SavingsMapping
    {
        public static Savings ToDomain(this SavingsData dto, Guid budgetId)
        {
            var savings = new Savings { BudgetId = budgetId };

            if (dto.Habits is not null)
            {
                if (dto.Habits.SavingMethods is not null)
                    foreach (var methodString in dto.Habits.SavingMethods)
                        savings.AddMethod(new SavingsMethod { Method = methodString });

                if (dto.Habits.MonthlySavings is not null)
                    savings.MonthlySavings = dto.Habits.MonthlySavings.Value;
            }

            if (dto.Goals is not null)
            {
                foreach (var goalDto in dto.Goals)
                    savings.AddGoal(goalDto.ToDomain());
            }

            return savings;
        }

        public static void ApplyPatchFrom(this Savings target, SavingsData dto)
        {
            // Habits substep owns habits fields
            if (dto.Habits is not null)
            {
                // replace methods if provided
                if (dto.Habits.SavingMethods is not null)
                {
                    target.SavingMethods.Clear();
                    foreach (var m in dto.Habits.SavingMethods)
                        target.AddMethod(new SavingsMethod { Method = m });
                }

                // overwrite monthly if provided (don’t default to 0)
                if (dto.Habits.MonthlySavings is not null)
                    target.MonthlySavings = dto.Habits.MonthlySavings.Value;
            }

            // Goals substep owns goals
            if (dto.Goals is not null)
            {
                target.SavingsGoals.Clear();
                foreach (var g in dto.Goals)
                    target.AddGoal(g.ToDomain());
            }
        }

        private static SavingsGoal ToDomain(this SavingsGoalDto dto) => new()
        {
            Name = dto.Name,
            TargetAmount = dto.TargetAmount,
            AmountSaved = dto.AmountSaved,
            TargetDate = dto.TargetDate,
            IsFavorite = dto.IsFavorite
        };
    }
}
