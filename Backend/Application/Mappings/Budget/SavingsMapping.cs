
using Backend.Application.DTO.Budget.Savings;
using Backend.Domain.Entities.Budget.Savings;

namespace Backend.Application.Mappings.Budget
{
    public static class SavingsMapping
    {
        // The wizard's `savingMethods` field collects habit answers
        // (auto/manual/invest/preferNot), not plan-level storage vehicles.
        // Those are intentionally NOT mapped into `SavingsMethod` — that
        // table holds savings_account/isk/funds/cash/custom only, written
        // through the savings editor. The wizard field is accepted on the
        // wire (so JSON deserializes) but is not persisted to SavingsMethod.
        public static Savings ToDomain(this SavingsData dto, Guid budgetId)
        {
            var savings = new Savings { BudgetId = budgetId };

            if (dto.Habits?.MonthlySavings is not null)
                savings.MonthlySavings = dto.Habits.MonthlySavings.Value;

            if (dto.Goals is not null)
            {
                foreach (var goalDto in dto.Goals)
                    savings.AddGoal(goalDto.ToDomain());
            }

            return savings;
        }

        public static void ApplyPatchFrom(this Savings target, SavingsData dto)
        {
            // See note on ToDomain — wizard habit answers are not written to
            // SavingsMethod. The habits substep here only owns MonthlySavings.
            if (dto.Habits?.MonthlySavings is not null)
                target.MonthlySavings = dto.Habits.MonthlySavings.Value;

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
