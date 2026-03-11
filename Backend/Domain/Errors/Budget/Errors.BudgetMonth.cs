using Backend.Domain.Common.Constants;
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;


public static partial class BudgetMonth
{
    public static readonly Error InvalidYearMonth =
        new("BudgetMonth.InvalidYearMonth", "TargetYearMonth must be YYYY-MM.", ErrorType.Validation);

    public static readonly Error InvalidCarryMode =
        new("BudgetMonth.InvalidCarryMode", "CarryOverMode must be none|full|custom.", ErrorType.Validation);

    public static readonly Error InvalidCarryAmount =
        new("BudgetMonth.InvalidCarryAmount", "CarryOverAmount must be 0 when mode is none.", ErrorType.Validation);

    public static readonly Error OpenMonthExists =
        new("BudgetMonth.OpenMonthExists", "An open month exists and must be closed explicitly.", ErrorType.Conflict);

    public static readonly Error MonthIsClosed =
        new("BudgetMonth.MonthIsClosed", "Cannot re-open a closed month.", ErrorType.Conflict);

    public static readonly Error BudgetNotFound =
        new("Budget.NotFound", "Budget was not found for the given Persoid.", ErrorType.NotFound);
    public static readonly Error InvalidTargetMonth =
        new("BudgetMonth.InvalidTargetMonth", "TargetYearMonth cannot be before an existing open month.", ErrorType.Validation);
    public static readonly Error MonthNotFound =
        new("BudgetMonth.MonthNotFound", "The specified budget month was not found.", ErrorType.NotFound);

    public static readonly Error SnapshotMissing =
        new("BudgetMonth.SnapshotMissing", "Closed month snapshot is missing.", ErrorType.Conflict);
}

