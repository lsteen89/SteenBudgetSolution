namespace Backend.Application.DTO.Budget.Months;

public static class BudgetMonthStatuses
{
    public const string Open = "open";
    public const string Closed = "closed";
    public const string Skipped = "skipped";
}

public static class BudgetMonthCarryOverModes
{
    public const string None = "none";
    public const string Full = "full";
    public const string Custom = "custom";
}

public static class BudgetMonthSuggestedActions
{
    public const string CreateFirstMonth = "createFirstMonth";
    public const string PromptStartCurrent = "promptStartCurrent";
    public const string None = "none";
}
