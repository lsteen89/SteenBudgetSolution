using System.Globalization;

namespace Backend.Application.Features.Budgets.Months.Helpers;

public static class YearMonthUtil
{
    public static string CurrentYearMonth(DateTime utcNow)
        => utcNow.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public static (int year, int month) Parse(string yearMonth)
    {
        if (!TryParse(yearMonth, out var year, out var month))
            throw new ArgumentException("YearMonth must be in format YYYY-MM", nameof(yearMonth));

        return (year, month);
    }

    public static bool TryParse(string? yearMonth, out int year, out int month)
    {
        year = 0;
        month = 0;

        if (string.IsNullOrWhiteSpace(yearMonth) || yearMonth.Length != 7 || yearMonth[4] != '-')
            return false;

        if (!int.TryParse(yearMonth[..4], NumberStyles.None, CultureInfo.InvariantCulture, out year))
            return false;

        if (!int.TryParse(yearMonth[5..7], NumberStyles.None, CultureInfo.InvariantCulture, out month))
            return false;

        if (month < 1 || month > 12) return false;

        return true;
    }

    /// <summary>
    /// Calendar month distance from -> to. If to is earlier than from, result is negative.
    /// </summary>
    public static int MonthsBetween(string fromYearMonth, string toYearMonth)
    {
        var (fy, fm) = Parse(fromYearMonth);
        var (ty, tm) = Parse(toYearMonth);
        return (ty - fy) * 12 + (tm - fm);
    }

    /// <summary>
    /// Returns YYYY-MM between (from, to), excluding endpoints.
    /// Example: from 2025-10 to 2026-01 => yields 2025-11, 2025-12
    /// </summary>
    public static IEnumerable<string> IntermediateMonths(string fromYearMonth, string toYearMonth)
    {
        var (fy, fm) = Parse(fromYearMonth);
        var (ty, tm) = Parse(toYearMonth);

        var cur = new DateTime(fy, fm, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        var end = new DateTime(ty, tm, 1, 0, 0, 0, DateTimeKind.Utc);

        while (cur < end)
        {
            yield return cur.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            cur = cur.AddMonths(1);
        }
    }

    /// <summary>
    /// Strict normalization (ensures leading zero month). Throws if invalid.
    /// </summary>
    public static string Normalize(string yearMonth)
    {
        var (y, m) = Parse(yearMonth);
        return $"{y:D4}-{m:D2}";
    }
}
