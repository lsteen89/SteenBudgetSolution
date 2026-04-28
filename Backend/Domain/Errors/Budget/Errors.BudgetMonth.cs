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

    public static readonly Error CarryAmountMustBeNullUnlessCustom =
        new("BudgetMonth.CarryAmountMustBeNullUnlessCustom",
            "Carry over amount must be empty unless carry over mode is custom.");

    public static readonly Error CustomCarryAmountRequired =
        new("BudgetMonth.CustomCarryAmountRequired",
            "Carry over amount is required when carry over mode is custom.");

    public static readonly Error CustomCarryAmountMustBeNonNegative =
        new("BudgetMonth.CustomCarryAmountMustBeNonNegative",
            "Carry over amount must be zero or greater.");

    public static readonly Error InvalidCloseCarryMode =
        new("BudgetMonth.InvalidCloseCarryMode", "CarryOverMode must be none|full.", ErrorType.Validation);

    public static readonly Error MonthMustBeOpenToClose =
        new("BudgetMonth.MonthMustBeOpenToClose", "Only open months can be closed.", ErrorType.Conflict);

    public static readonly Error MonthNotEligibleToClose =
        new("BudgetMonth.MonthNotEligibleToClose", "This budget month is not eligible to close yet.", ErrorType.Conflict);

    public static readonly Error MonthDataUnavailable =
        new("BudgetMonth.MonthDataUnavailable", "Budget month data could not be loaded for closing.", ErrorType.Conflict);

    public static readonly Error NextMonthMustBeOpen =
        new("BudgetMonth.NextMonthMustBeOpen", "The next budget month must be open to apply carry-over settings.", ErrorType.Conflict);

    public static readonly Error NextMonthEnsureFailed =
        new("BudgetMonth.NextMonthEnsureFailed", "The next budget month could not be created or loaded.", ErrorType.Conflict);

    public static readonly Error NextMonthCarryOverUpdateFailed =
        new("BudgetMonth.NextMonthCarryOverUpdateFailed", "Could not update next month carry-over settings.", ErrorType.Conflict);

    public static readonly Error CloseResultUnavailable =
        new("BudgetMonth.CloseResultUnavailable", "Closed month result data could not be loaded.", ErrorType.Conflict);

    public static readonly Error NotFound =
        new("BudgetMonth.NotFound", "The specified budget month was not found.", ErrorType.NotFound);

    public static readonly Error CarryOverRequiresPreviousMonth =
        new("BudgetMonth.CarryOverRequiresPreviousMonth", "Carry over cannot be applied without a previous month to carry over from.", ErrorType.Validation);
}
