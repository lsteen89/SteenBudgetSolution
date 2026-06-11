namespace Backend.Application.DTO.Budget.Months;

public static class BudgetMonthStatuses
{
    public const string Open = "open";
    // Materialized next month that is editable ahead of time but not yet the
    // active month. Promoted to `open` when the current month closes.
    public const string Planned = "planned";
    public const string Closed = "closed";
    public const string Skipped = "skipped";
}

public static class BudgetMonthCarryOverModes
{
    public const string None = "none";
    public const string Full = "full";
    public const string Custom = "custom";
}

public static class BudgetMonthSubscriptionLifecycleStatuses
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Cancelled = "cancelled";

    public static bool IsSupported(string? value)
        => value is null ||
           value == Active ||
           value == Paused ||
           value == Cancelled;
}

public static class BudgetMonthSuggestedActions
{
    public const string CreateFirstMonth = "createFirstMonth";
    public const string PromptStartCurrent = "promptStartCurrent";
    public const string None = "none";
}

public static class BudgetMonthExpenseEditScopes
{
    public const string CurrentMonthOnly = "currentMonthOnly";
    public const string CurrentMonthAndBudgetPlan = "currentMonthAndBudgetPlan";
    public const string BudgetPlanOnly = "budgetPlanOnly";

    public static bool IsSupported(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan ||
           value == BudgetPlanOnly;

    public static bool WritesCurrentMonth(string scope)
        => scope == CurrentMonthOnly || scope == CurrentMonthAndBudgetPlan;

    public static bool WritesBudgetPlan(string scope)
        => scope == CurrentMonthAndBudgetPlan || scope == BudgetPlanOnly;
}

public static class BudgetMonthIncomeEditScopes
{
    public const string CurrentMonthOnly = "currentMonthOnly";
    public const string CurrentMonthAndBudgetPlan = "currentMonthAndBudgetPlan";
    public const string BudgetPlanOnly = "budgetPlanOnly";

    public static bool IsSupported(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan ||
           value == BudgetPlanOnly;

    // Create is intentionally narrower than edit: there is no row to write to
    // yet, so `budgetPlanOnly` would mean "create a plan row only", which is
    // a future-plan add use case the income editor deliberately does not
    // expose. Keep the user choice binary — only this month, or also part of
    // the plan going forward.
    public static bool IsSupportedCreateScope(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan;

    public static bool WritesCurrentMonth(string scope)
        => scope == CurrentMonthOnly || scope == CurrentMonthAndBudgetPlan;

    public static bool WritesBudgetPlan(string scope)
        => scope == CurrentMonthAndBudgetPlan || scope == BudgetPlanOnly;
}

public static class BudgetMonthIncomeItemKinds
{
    public const string Salary = "salary";
    public const string SideHustle = "sideHustle";
    public const string HouseholdMember = "householdMember";

    public static bool IsSupported(string? value)
        => value == Salary ||
           value == SideHustle ||
           value == HouseholdMember;

    public static bool IsSupportedCreateKind(string? value)
        => value == SideHustle ||
           value == HouseholdMember;
}

public static class BudgetMonthSavingsGoalEditScopes
{
    public const string CurrentMonthOnly = "currentMonthOnly";
    public const string CurrentMonthAndBudgetPlan = "currentMonthAndBudgetPlan";
    public const string BudgetPlanOnly = "budgetPlanOnly";

    public static bool IsSupported(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan ||
           value == BudgetPlanOnly;

    public static bool WritesCurrentMonth(string scope)
        => scope == CurrentMonthOnly || scope == CurrentMonthAndBudgetPlan;

    public static bool WritesBudgetPlan(string scope)
        => scope == CurrentMonthAndBudgetPlan || scope == BudgetPlanOnly;
}

// Edit scopes for the per-month base savings scalar (`BudgetMonthSavings.MonthlySavings` /
// `Savings.MonthlySavings`). Same three-scope contract every other domain uses,
// kept as a dedicated class so the base-savings handler/validator do not
// accidentally couple to goal-contribution semantics.
public static class BudgetMonthBaseSavingsEditScopes
{
    public const string CurrentMonthOnly = "currentMonthOnly";
    public const string CurrentMonthAndBudgetPlan = "currentMonthAndBudgetPlan";
    public const string BudgetPlanOnly = "budgetPlanOnly";

    public static bool IsSupported(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan ||
           value == BudgetPlanOnly;

    public static bool WritesCurrentMonth(string scope)
        => scope == CurrentMonthOnly || scope == CurrentMonthAndBudgetPlan;

    public static bool WritesBudgetPlan(string scope)
        => scope == CurrentMonthAndBudgetPlan || scope == BudgetPlanOnly;
}

public static class BudgetMonthDebtEditScopes
{
    public const string CurrentMonthOnly = "currentMonthOnly";
    public const string CurrentMonthAndBudgetPlan = "currentMonthAndBudgetPlan";
    public const string BudgetPlanOnly = "budgetPlanOnly";

    public static bool IsSupported(string? value)
        => value is null ||
           value == CurrentMonthOnly ||
           value == CurrentMonthAndBudgetPlan ||
           value == BudgetPlanOnly;

    public static bool WritesCurrentMonth(string scope)
        => scope == CurrentMonthOnly || scope == CurrentMonthAndBudgetPlan;

    public static bool WritesBudgetPlan(string scope)
        => scope == CurrentMonthAndBudgetPlan || scope == BudgetPlanOnly;
}
