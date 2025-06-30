import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface IWizardContext extends IWizardFlags {
  isActionBlocked: boolean;
  setIsActionBlocked: (isBlocked: boolean) => void;
  setWizardFlags: (flags: Partial<IWizardFlags>) => void;
}
interface IWizardFlags {
  goalsHaveBeenSet: boolean;
}

const WizardContext = createContext<IWizardContext | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [isActionBlocked, setIsActionBlocked] = useState(false);

  const [wizardFlags, setWizardFlagsState] = useState<IWizardFlags>({
    goalsHaveBeenSet: false,
  });

  const setWizardFlags = useCallback((flags: Partial<IWizardFlags>) => {
    setWizardFlagsState(prevFlags => ({ ...prevFlags, ...flags }));
  }, []);

  const value: IWizardContext = {
    isActionBlocked,
    setIsActionBlocked,
    ...wizardFlags, // Spread the current flag values (e.g., goalsHaveBeenSet)
    setWizardFlags,  // Provide the setter function
  };
  console.log('[WizardContext] Provider rendering. Current flags:', value);
  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};