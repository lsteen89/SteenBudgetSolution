using Backend.Application.DTO.Budget.Debt;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Wizard;

namespace Backend.Application.Mappings.Budget
{
    public static class DebtMapping
    {
        // The main mapper. Takes the DTO, returns the Debts and the Strategy.
        public static WizardDebtResult ToDomain(this DebtData dto, Guid budgetId)
        {
            // Use LINQ to project the DTOs into domain entities.
            var debtEntities = dto.Debts?
                .Select(debtDto => debtDto.ToDomain(budgetId))
                .ToList() ?? new List<Debt>();

            // Get the strategy from the summary.
            var strategy = dto.Summary is null
                ? null
                : new RepaymentStrategy(dto.Summary.RepaymentStrategy ?? "default-value");

            // Return both pieces
            return new WizardDebtResult(debtEntities, strategy);
        }

        // Helper mapper for a single debt item. This is where the real translation happens.
        private static Debt ToDomain(this DebtItemDto dto, Guid budgetId)
        {
            return new Debt
            {
                // The Executor will handle the real Id. We leave it empty for now.
                Id = Guid.Empty,
                BudgetId = budgetId,
                Name = dto.Name,
                Type = dto.Type,
                Balance = dto.Balance,
                Apr = dto.Apr,
                MonthlyFee = dto.MonthlyFee,
                MinPayment = dto.MinPayment,
                TermMonths = dto.TermMonths
                // CreatedAt and CreatedByUserId will be set by the Executor.
            };
        }
    }
}
