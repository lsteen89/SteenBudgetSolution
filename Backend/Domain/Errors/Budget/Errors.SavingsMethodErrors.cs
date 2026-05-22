using Backend.Domain.Common.Constants;
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static class SavingsMethodErrors
{
    public static readonly Error SavingsPlanMissing =
        new(
            "SavingsMethod.SavingsPlanMissing",
            "The budget plan does not have a savings record yet; methods cannot be added.",
            ErrorType.Conflict);

    public static readonly Error UnknownCode =
        new(
            "SavingsMethod.UnknownCode",
            "Method code is not in the allowed set.",
            ErrorType.Validation);

    public static readonly Error CustomLabelRequired =
        new(
            "SavingsMethod.CustomLabelRequired",
            "Custom methods require a non-empty label.",
            ErrorType.Validation);

    public static readonly Error CustomLabelNotAllowed =
        new(
            "SavingsMethod.CustomLabelNotAllowed",
            "Only custom methods may carry a label.",
            ErrorType.Validation);

    public static readonly Error AlreadyExists =
        new(
            "SavingsMethod.AlreadyExists",
            "This savings method is already on the plan.",
            ErrorType.Conflict);

    public static readonly Error NotFound =
        new(
            "SavingsMethod.NotFound",
            "Savings method was not found on this plan.",
            ErrorType.NotFound);
}
