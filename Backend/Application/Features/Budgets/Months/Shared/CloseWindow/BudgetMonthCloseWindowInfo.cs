namespace Backend.Application.Features.Budgets.Months.Shared.CloseWindow;

public sealed record BudgetMonthCloseWindowInfo(
    bool IsCloseWindowOpen,
    DateTime? CloseWindowOpensAtUtc,
    DateTime? CloseEligibleAtUtc,
    bool IsOverdueForClose)
{
    public static BudgetMonthCloseWindowInfo Unavailable()
        => new(
            IsCloseWindowOpen: false,
            CloseWindowOpensAtUtc: null,
            CloseEligibleAtUtc: null,
            IsOverdueForClose: false);
}
