namespace Backend.Domain.Entities.Budget.Savings;

// Stable system codes for plan-level savings methods (storage vehicles).
// These are persisted verbatim in SavingsMethod.MethodCode and shared on the
// wire with the frontend. Codes must match the CHECK constraint and the
// frontend SavingsMethodCode union exactly.
public static class SavingsMethodCodes
{
    public const string SavingsAccount = "savings_account";
    public const string Isk            = "isk";
    public const string Funds          = "funds";
    public const string Cash           = "cash";
    public const string Custom         = "custom";

    private static readonly HashSet<string> Known = new(StringComparer.Ordinal)
    {
        SavingsAccount,
        Isk,
        Funds,
        Cash,
        Custom,
    };

    public static bool IsKnown(string? code) =>
        code is not null && Known.Contains(code);

    public static bool IsCustom(string? code) =>
        code is not null && string.Equals(code, Custom, StringComparison.Ordinal);
}
