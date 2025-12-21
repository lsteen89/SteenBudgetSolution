export const useCurrencyFormat = (currency: string) => {
    const formatAmount = (value: number) => `${value.toLocaleString("sv-SE")} ${currency}`;
    return { formatAmount };
};