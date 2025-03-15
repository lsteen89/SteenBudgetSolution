import { useState } from "react";

interface BudgetInfoDisplayFlags {
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
}

const useBudgetInfoDisplayFlags = () => {
  const [flags, setFlags] = useState<BudgetInfoDisplayFlags>({
    showSideIncome: false,
    showHouseholdMembers: false,
  });

  const setShowSideIncome = (value: boolean) => {
    setFlags((prev) => ({ ...prev, showSideIncome: value }));
  };

  const setShowHouseholdMembers = (value: boolean) => {
    setFlags((prev) => ({ ...prev, showHouseholdMembers: value }));
  };

  return { flags, setShowSideIncome, setShowHouseholdMembers };
};

export default useBudgetInfoDisplayFlags;
