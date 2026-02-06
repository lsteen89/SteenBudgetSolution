using Backend.Application.Models.Wizard;

namespace Application.Features.Wizard.SaveStep.Sanitizers;

public static class ExpenditureSanitizer
{
    public static ExpenditureFormValues Sanitize(ExpenditureFormValues dto)
    {
        return dto with
        {
            FixedExpenses = SanitizeFixedExpenses(dto.FixedExpenses),
            Subscriptions = SanitizeSubscriptions(dto.Subscriptions),
        };
    }

    private static FixedExpensesSubForm? SanitizeFixedExpenses(FixedExpensesSubForm? fixedExp)
    {
        if (fixedExp?.CustomExpenses is null || fixedExp.CustomExpenses.Count == 0)
            return fixedExp;

        var cleaned = RowSanitizer.DropEmpty(
            fixedExp.CustomExpenses,
            isEmpty: x => string.IsNullOrWhiteSpace(x.Name) && !x.Cost.HasValue,
            normalize: x => x with { Name = x.Name?.Trim() }
        );

        return fixedExp with { CustomExpenses = cleaned };
    }

    private static SubscriptionsSubForm? SanitizeSubscriptions(SubscriptionsSubForm? subs)
    {
        if (subs?.CustomSubscriptions is null || subs.CustomSubscriptions.Count == 0)
            return subs;

        var cleaned = RowSanitizer.DropEmpty(
            subs.CustomSubscriptions,
            isEmpty: x => string.IsNullOrWhiteSpace(x.Name) && !x.Cost.HasValue,
            normalize: x => x with { Name = x.Name?.Trim() }
        );

        return subs with { CustomSubscriptions = cleaned };
    }
}
