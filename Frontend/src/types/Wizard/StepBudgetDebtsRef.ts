import { FieldErrors } from 'react-hook-form';
import { Step4FormValues } from './Step4FormValues';

export interface StepBudgetDebtsRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step4FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step4FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
}
