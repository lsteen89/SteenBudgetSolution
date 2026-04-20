using Backend.Application.Models.Wizard;

namespace Application.Features.Wizard.SaveStep.Sanitizers;

public static class IncomeSanitizer
{
    public static IncomeFormValues Sanitize(IncomeFormValues dto)
    {
        var normalizedPaymentDayType = string.IsNullOrWhiteSpace(dto.IncomePaymentDayType)
            ? null
            : dto.IncomePaymentDayType.Trim();

        return dto with
        {
            IncomePaymentDayType = normalizedPaymentDayType,
            IncomePaymentDay = normalizedPaymentDayType == "lastDayOfMonth"
                ? null
                : dto.IncomePaymentDay,
            HouseholdMembers = RowSanitizer.DropEmpty(
                dto.HouseholdMembers,
                IsEmptyRow,
                Normalize),

            SideHustles = RowSanitizer.DropEmpty(
                dto.SideHustles,
                IsEmptyRow,
                Normalize)
        };
    }

    private static IncomeItem Normalize(IncomeItem x)
        => x with { Name = x.Name?.Trim() };

    private static bool IsEmptyRow(IncomeItem x)
        => string.IsNullOrWhiteSpace(x.Name)
           && !x.Income.HasValue
           && !x.Frequency.HasValue;
}
