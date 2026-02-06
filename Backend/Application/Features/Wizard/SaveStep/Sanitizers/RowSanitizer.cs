namespace Application.Features.Wizard.SaveStep.Sanitizers;

public static class RowSanitizer
{
    public static List<T> DropEmpty<T>(
        IEnumerable<T?>? rows,
        Func<T, bool> isEmpty,
        Func<T, T>? normalize = null)
        where T : class
    {
        if (rows is null) return new();

        return rows
            .Where(x => x is not null)
            .Select(x => normalize is null ? x! : normalize(x!))
            .Where(x => !isEmpty(x))
            .ToList();
    }
}