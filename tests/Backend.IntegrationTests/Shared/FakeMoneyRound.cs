internal static class MoneyRound
{
    public static decimal Kr(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}