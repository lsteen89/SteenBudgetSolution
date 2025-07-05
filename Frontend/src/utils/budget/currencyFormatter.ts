export default (value: number | null | undefined) => {
  return (value ?? 0).toLocaleString('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  });
};

const baseKr = new Intl.NumberFormat("sv-SE", {
  style:           "currency",
  currency:        "SEK",
  currencyDisplay: "narrowSymbol",   // “kr”
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value: number) => baseKr.format(value);

/**  Returns `{ number: "+12 345,67", currency: "kr" }`  */
export const formatCurrencyParts = (
  value: number,
  alwaysSign = true,
) => {
  const abs  = Math.abs(value);
  const sign = alwaysSign ? (value < 0 ? "-" : "+") : value < 0 ? "-" : "";

  const parts = baseKr.formatToParts(abs);
  const num   = parts.filter(p => p.type !== "currency").map(p => p.value).join("");
  const curr  = parts.find(p => p.type === "currency")?.value ?? "";

  return { number: `${sign}${num}`, currency: curr };
};