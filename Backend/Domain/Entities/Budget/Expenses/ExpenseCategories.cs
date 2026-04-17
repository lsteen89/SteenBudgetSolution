namespace Backend.Domain.Entities.Budget.Expenses;

public static class ExpenseCategories
{
    public static readonly Guid Housing = Guid.Parse("2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21");
    public static readonly Guid Food = Guid.Parse("5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10");
    public static readonly Guid Transport = Guid.Parse("5eb2896c-59f9-4a18-8c84-4c2a1659de80");
    public static readonly Guid Clothing = Guid.Parse("e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0");
    public static readonly Guid FixedExpense = Guid.Parse("8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900");
    public static readonly Guid Subscription = Guid.Parse("9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4");
    public static readonly Guid Other = Guid.Parse("f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2");

    private static readonly IReadOnlyList<ExpenseCategoryDefinition> _definitions =
    [
        new(Housing, "housing", "Housing", 0, "rent"),
        new(Food, "food", "Food", 1),
        new(Transport, "transport", "Transport", 2),
        new(Clothing, "clothing", "Clothing", 3),
        new(FixedExpense, "fixed_expense", "FixedExpense", 4, "fixed", "fixedexpense"),
        new(Subscription, "subscription", "Subscription", 5, "subscriptions"),
        new(Other, "other", "Other", 6)
    ];

    private static readonly IReadOnlyDictionary<Guid, ExpenseCategoryDefinition> _byId =
        _definitions.ToDictionary(x => x.Id);

    private static readonly IReadOnlyDictionary<string, ExpenseCategoryDefinition> _byAlias =
        BuildAliasLookup(_definitions);

    private static readonly HashSet<Guid> _all = new(_definitions.Select(x => x.Id));

    public static IReadOnlyList<ExpenseCategoryDefinition> Definitions => _definitions;

    public static IReadOnlySet<Guid> All => _all;

    public static IReadOnlyDictionary<Guid, string> NameById { get; } =
        _definitions.ToDictionary(x => x.Id, x => x.Name);

    public static IReadOnlyDictionary<Guid, string> KeyById { get; } =
        _definitions.ToDictionary(x => x.Id, x => x.Code);

    public static bool TryGet(Guid categoryId, out ExpenseCategoryDefinition definition)
        => _byId.TryGetValue(categoryId, out definition!);

    public static bool TryGet(string aliasOrName, out ExpenseCategoryDefinition definition)
        => _byAlias.TryGetValue(Normalize(aliasOrName), out definition!);

    public static bool TryGetCode(Guid categoryId, out string code)
    {
        if (TryGet(categoryId, out var definition))
        {
            code = definition.Code;
            return true;
        }

        code = string.Empty;
        return false;
    }

    public static bool TryGetName(Guid categoryId, out string name)
    {
        if (TryGet(categoryId, out var definition))
        {
            name = definition.Name;
            return true;
        }

        name = string.Empty;
        return false;
    }

    public static bool TryGetSortOrder(Guid categoryId, out int sortOrder)
    {
        if (TryGet(categoryId, out var definition))
        {
            sortOrder = definition.SortOrder;
            return true;
        }

        sortOrder = int.MaxValue;
        return false;
    }

    public static string Key(Guid categoryId) =>
        TryGetCode(categoryId, out var code)
            ? code
            : categoryId.ToString();

    public static string Name(Guid categoryId) =>
        TryGetName(categoryId, out var name)
            ? name
            : categoryId.ToString();

    public static int SortOrder(Guid categoryId) =>
        TryGetSortOrder(categoryId, out var sortOrder)
            ? sortOrder
            : int.MaxValue;

    private static IReadOnlyDictionary<string, ExpenseCategoryDefinition> BuildAliasLookup(
        IEnumerable<ExpenseCategoryDefinition> definitions)
    {
        var lookup = new Dictionary<string, ExpenseCategoryDefinition>(StringComparer.Ordinal);

        foreach (var definition in definitions)
        {
            RegisterAlias(lookup, definition.Code, definition);
            RegisterAlias(lookup, definition.Name, definition);

            foreach (var alias in definition.Aliases)
            {
                RegisterAlias(lookup, alias, definition);
            }
        }

        return lookup;
    }

    private static void RegisterAlias(
        IDictionary<string, ExpenseCategoryDefinition> lookup,
        string value,
        ExpenseCategoryDefinition definition)
    {
        var key = Normalize(value);

        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        if (lookup.TryGetValue(key, out var existing) && existing.Id != definition.Id)
        {
            throw new InvalidOperationException(
                $"Expense category alias '{value}' is mapped to multiple categories.");
        }

        lookup[key] = definition;
    }

    private static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return new string(
            value
                .Trim()
                .ToLowerInvariant()
                .Where(ch => ch is not (' ' or '_' or '-'))
                .ToArray());
    }
}
