public static class SavingsGoalContribution
{
    public static decimal ComputeMonthlyContribution(
        decimal? targetAmount,
        decimal? amountSaved,
        DateTime? targetDate,
        DateTime nowUtc)
    {
        if (targetAmount is null || targetDate is null) return 0m;

        var remaining = Math.Max(0m, targetAmount.Value - (amountSaved ?? 0m));

        // If the date is already passed (or today), simplest: 0
        // (Later you can decide to "catch up" instead.)
        if (targetDate.Value.Date <= nowUtc.Date) return 0m;

        var monthsLeft = MonthsBetweenCeil(nowUtc.Date, targetDate.Value.Date);
        if (monthsLeft <= 0) monthsLeft = 1;

        return MoneyRound.Kr(remaining / monthsLeft);
    }

    // Counts months from start->end, ceiling-ish, so Jan 13 -> Feb 1 counts as 1 month.
    private static int MonthsBetweenCeil(DateTime start, DateTime end)
    {
        var months = (end.Year - start.Year) * 12 + (end.Month - start.Month);
        // If end day is after start day, count the current partial month as well.
        if (end.Day > start.Day) months += 1;
        return months;
    }
}
