import { useState, useEffect } from "react";
import { Frequency } from "@/types/common";


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
      case "Weekly":
        newAmount *= 52;
        break;
      case "Quarterly":
        newAmount *= 4;
        break;
      case "Yearly":
        // do nothing
        break;
      case "Monthly":
      default:
        newAmount *= 12;
        break;
    }
    setYearlyIncome(newAmount);
  }, [amount, frequency]);

  return yearlyIncome;
}
