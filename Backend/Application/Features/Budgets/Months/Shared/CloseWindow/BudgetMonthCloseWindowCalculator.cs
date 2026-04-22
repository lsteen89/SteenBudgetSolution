using Backend.Application.Features.Budgets.Months.Helpers;

namespace Backend.Application.Features.Budgets.Months.Shared.CloseWindow;

public static class BudgetMonthCloseWindowCalculator
{
    private const string DayOfMonth = "dayOfMonth";
    private const string LastDayOfMonth = "lastDayOfMonth";
    private const int CloseWindowDaysBeforeDue = 3;

    public static BudgetMonthCloseWindowInfo Calculate(
        string yearMonth,
        string? incomePaymentDayType,
        int? incomePaymentDay,
        DateTime nowUtc)
    {
        if (!YearMonthUtil.TryParse(yearMonth, out var year, out var month))
        {
            return BudgetMonthCloseWindowInfo.Unavailable();
        }

        var closeEligibleAtUtc = ResolveCloseEligibleAtUtc(
            year,
            month,
            incomePaymentDayType,
            incomePaymentDay);

        if (closeEligibleAtUtc is null)
        {
            return BudgetMonthCloseWindowInfo.Unavailable();
        }

        var normalizedNowUtc = nowUtc.Kind == DateTimeKind.Utc
            ? nowUtc
            : nowUtc.ToUniversalTime();

        var closeWindowOpensAtUtc = closeEligibleAtUtc.Value.AddDays(-CloseWindowDaysBeforeDue);

        var isCloseWindowOpen = normalizedNowUtc >= closeWindowOpensAtUtc;
        var isOverdueForClose = normalizedNowUtc >= closeEligibleAtUtc.Value;

        return new BudgetMonthCloseWindowInfo(
            IsCloseWindowOpen: isCloseWindowOpen,
            CloseWindowOpensAtUtc: closeWindowOpensAtUtc,
            CloseEligibleAtUtc: closeEligibleAtUtc.Value,
            IsOverdueForClose: isOverdueForClose);
    }

    private static DateTime? ResolveCloseEligibleAtUtc(
        int year,
        int month,
        string? incomePaymentDayType,
        int? incomePaymentDay)
    {
        if (string.Equals(incomePaymentDayType, DayOfMonth, StringComparison.Ordinal))
        {
            if (incomePaymentDay is null || incomePaymentDay < 1 || incomePaymentDay > 28)
            {
                return null;
            }

            return new DateTime(
                year,
                month,
                incomePaymentDay.Value,
                0,
                0,
                0,
                DateTimeKind.Utc);
        }

        if (string.Equals(incomePaymentDayType, LastDayOfMonth, StringComparison.Ordinal))
        {
            return new DateTime(
                year,
                month,
                DateTime.DaysInMonth(year, month),
                0,
                0,
                0,
                DateTimeKind.Utc);
        }

        return null;
    }
}