export interface GoalTemplate {
  name: "Resa till solen" | "Buffert" | "Ny bil" | "Kontantinsats";
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD format
}

/**
 * Our date specialist. Give him a number of years, he gives you back a
 * perfect YYYY-MM-DD string for that many years in the future.
 * Always fresh, never expired.
 * @param yearsToAdd How many years to add to today's date.
 * @returns A string like "2026-06-23"
 */
const getFutureDate = (yearsToAdd: number): string => {
  const today = new Date();
  today.setFullYear(today.getFullYear() + yearsToAdd);
  // .toISOString() gives us "2026-06-23T10:00:00.000Z"
  // We just clip the first 10 characters. 
  return today.toISOString().slice(0, 10);
};


export const goalTemplates: GoalTemplate[] = [
  { 
    name: "Resa till solen", 
    targetAmount: 25000, 
    targetDate: getFutureDate(1) // Always 1 year from now.
  },
  { 
    name: "Buffert", 
    targetAmount: 50000, 
    targetDate: getFutureDate(2) // Always 2 years from now.
  },
  { 
    name: "Ny bil", 
    targetAmount: 75000, 
    targetDate: getFutureDate(3) // Always 3 years from now.
  },
  { 
    name: "Kontantinsats", 
    targetAmount: 150000, 
    targetDate: getFutureDate(5) // The big one is always 5 years away.
  },
];