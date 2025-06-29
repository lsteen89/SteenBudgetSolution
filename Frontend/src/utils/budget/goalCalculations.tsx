export const calculateMonthlyContribution = (
  target: number | null | undefined,
  saved: number | null | undefined,
  date:  Date  | null | undefined
): number => {
  if (!target || !date) return 0;                             

  const remaining = Math.max(target - (saved ?? 0), 0);
  if (remaining === 0) return 0;                              

  const now   = new Date();
  now.setHours(0, 0, 0, 0);

  const end   = new Date(date);
  if (end <= now) return remaining;                           

  const months = Math.max(                                    
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth()  - now.getMonth())       + 1,
    1,
  );

  return Math.ceil(remaining / months);
};


export const calcProgress = (
  target: number | null | undefined,
  saved:  number | null | undefined
): number =>
  target ? Math.min(100, Math.round(((saved ?? 0) / target) * 100)) : 0;
