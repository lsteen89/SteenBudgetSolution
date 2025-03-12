import { useState, useEffect } from "react";

type Frequency = "weekly" | "monthly" | "quarterly" | "annually";

interface UseYearlyIncomeProps {
  amount: number | null;
  frequency: Frequency;
}

export default function useYearlyIncome({ amount, frequency }: UseYearlyIncomeProps) {
  const [yearlyIncome, setYearlyIncome] = useState<number | null>(0);

  useEffect(() => {
    if (!amount || amount <= 0) {
      setYearlyIncome(null);
      return;
    }
    let newAmount = amount;
    switch (frequency) {
      case "weekly":
        newAmount *= 52;
        break;
      case "quarterly":
        newAmount *= 4;
        break;
      case "annually":
        // do nothing
        break;
      case "monthly":
      default:
        newAmount *= 12;
        break;
    }
    setYearlyIncome(newAmount);
  }, [amount, frequency]);

  return yearlyIncome;
}
