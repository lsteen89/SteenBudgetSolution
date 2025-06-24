import React, { createContext, useState, useContext, ReactNode } from 'react';

interface IWizardContext {
  isActionBlocked: boolean;
  setIsActionBlocked: (isBlocked: boolean) => void;
}

const WizardContext = createContext<IWizardContext | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [isActionBlocked, setIsActionBlocked] = useState(false);

  return (
    <WizardContext.Provider value={{ isActionBlocked, setIsActionBlocked }}>
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