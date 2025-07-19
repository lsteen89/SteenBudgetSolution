using Backend.Domain.Enums;

namespace Backend.Domain.Common
{
    public static class FrequencyConversion
    {
        // Choose one canonical conversion strategy:
        // - Weekly: amount * 52 / 12
        // - BiWeekly: amount * 26 / 12
        // - Monthly: amount
        // - Yearly: amount / 12
        public static decimal ToMonthly(decimal? amount, Frequency freq)
        {
            if (amount is null) return 0M;

            return freq switch
            {
                Frequency.Monthly => amount.Value,
                Frequency.Weekly => amount.Value * 52M / 12M,
                Frequency.BiWeekly => amount.Value * 26M / 12M,
                Frequency.Yearly => amount.Value / 12M,
                _ => amount.Value
            };
        }
    }
}