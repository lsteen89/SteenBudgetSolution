import { FieldErrors } from 'react-hook-form';
import { Step3FormValues } from './Step3FormValues';

export interface StepBudgetSavingsRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step3FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step3FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
}
