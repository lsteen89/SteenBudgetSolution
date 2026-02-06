namespace Backend.Domain.Entities.Budget.Expenses
{
    public static class ExpenseCategories
    {
        public static readonly Guid Housing = Guid.Parse("2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21");
        public static readonly Guid Food = Guid.Parse("5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10");
        public static readonly Guid Transport = Guid.Parse("5eb2896c-59f9-4a18-8c84-4c2a1659de80");
        public static readonly Guid Clothing = Guid.Parse("e47e5c5d-4c97-4d87-89aa-e7a86b8f5ac0");
        public static readonly Guid FixedExpense = Guid.Parse("8aa1d1b8-5b70-4fde-9e3f-b60dc4bfc900");
        public static readonly Guid Subscription = Guid.Parse("9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4");
        public static readonly Guid Other = Guid.Parse("f9f68c35-2f9b-4a8c-9faa-6f5212d3e6d2");

        // Parsing / lookup aliases (case-insensitive)
        public static IReadOnlyDictionary<string, Guid> ByNameInsensitive { get; } =
            new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase)
            {
                ["housing"] = Housing,
                ["food"] = Food,
                ["transport"] = Transport,
                ["clothing"] = Clothing,
                ["fixedexpense"] = FixedExpense,
                ["subscription"] = Subscription,
                ["other"] = Other,

                // OPTIONAL: extra aliases you might accept from FE/user input
                ["fixed_expense"] = FixedExpense,
                ["fixed-expense"] = FixedExpense,
                ["fixedExpense"] = FixedExpense,
            };

        private static readonly HashSet<Guid> _all = new(ByNameInsensitive.Values);

        /// <summary>All known category IDs (HashSet for O(1) membership tests).</summary>
        public static IReadOnlySet<Guid> All => _all;

        // Canonical display names (what you output in preview/live/dashboard)
        public static IReadOnlyDictionary<Guid, string> NameById { get; } =
            new Dictionary<Guid, string>
            {
                [Housing] = "Housing",
                [Food] = "Food",
                [Transport] = "Transport",
                [Clothing] = "Clothing",
                [FixedExpense] = "FixedExpense",
                [Subscription] = "Subscription",
                [Other] = "Other",
            };
        public static IReadOnlyDictionary<Guid, string> KeyById { get; } =
        new Dictionary<Guid, string>
        {
            [Housing] = "housing",
            [Food] = "food",
            [Transport] = "transport",
            [Clothing] = "clothing",
            [FixedExpense] = "fixed",
            [Subscription] = "subscription",
            [Other] = "other",
        };

        public static string Key(Guid categoryId) =>
            KeyById.TryGetValue(categoryId, out var key)
                ? key
                : categoryId.ToString();

    }
}
