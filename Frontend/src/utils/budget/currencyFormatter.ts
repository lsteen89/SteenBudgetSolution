export default (value: number | null | undefined) => {
  return (value ?? 0).toLocaleString('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  });
};