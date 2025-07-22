using Backend.Domain.Entities.Budget.Debt;

namespace Backend.Domain.Entities.Wizard
{
    public sealed record WizardDebtResult(
        IReadOnlyList<Debt> Debts,
        RepaymentStrategy? Strategy);
}
