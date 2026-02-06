import React, { createContext, useState, useContext, ReactNode, useCallback } from "react";


type ValidationKey = "step3.goals" | "step4.debts";
type WizardModal = "none" | "debtTemplate" | "goalTemplate";

interface IWizardFlags {
  goalsHaveBeenSet: boolean;
  debtsHaveBeenSet: boolean;
}

interface IWizardContext extends IWizardFlags {
  // Navigation blocking (keep your existing behavior)
  isActionBlocked: boolean;
  setIsActionBlocked: (isBlocked: boolean) => void;

  // Modal UI state (new, clean)
  activeModal: WizardModal;
  openModal: (m: Exclude<WizardModal, "none">) => void;
  closeModal: () => void;

  validationAttempted: Partial<Record<ValidationKey, boolean>>;
  setValidationAttempted: (key: ValidationKey, v: boolean) => void;

  setWizardFlags: (flags: Partial<IWizardFlags>) => void;
}

const WizardContext = createContext<IWizardContext | undefined>(undefined);

export const WizardProvider = ({ children }: { children: ReactNode }) => {
  const [isActionBlocked, setIsActionBlocked] = useState(false);

  const [activeModal, setActiveModal] = useState<WizardModal>("none");

  const [wizardFlags, setWizardFlagsState] = useState<IWizardFlags>({
    goalsHaveBeenSet: false,
    debtsHaveBeenSet: false,
  });

  const setWizardFlags = useCallback((flags: Partial<IWizardFlags>) => {
    setWizardFlagsState((prev) => ({ ...prev, ...flags }));
  }, []);

  const openModal = useCallback((m: Exclude<WizardModal, "none">) => {
    setActiveModal(m);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal("none");
  }, []);
  const [validationAttempted, setValidationAttemptedState] =
    useState<Partial<Record<ValidationKey, boolean>>>({});

  const setValidationAttempted = useCallback((key: ValidationKey, v: boolean) => {
    setValidationAttemptedState(prev => ({ ...prev, [key]: v }));
  }, []);

  const value: IWizardContext = {
    isActionBlocked,
    setIsActionBlocked,

    activeModal,
    openModal,
    closeModal,

    validationAttempted,
    setValidationAttempted,

    ...wizardFlags,
    setWizardFlags,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
};
