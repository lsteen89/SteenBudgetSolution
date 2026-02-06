namespace Application.Features.Wizard.SaveStep.Policy;

public static class WizardPersistPolicy
{
    private static readonly HashSet<(int Step, int Sub)> SummarySubSteps = new()
    {
        (2, 8),      // Expenditure summary
        (3, 4),     // Savings summary
        //(4, 3),  // Debts currently sends data on summary
    };

    public static bool IsSummary(int step, int sub) => SummarySubSteps.Contains((step, sub));
}
