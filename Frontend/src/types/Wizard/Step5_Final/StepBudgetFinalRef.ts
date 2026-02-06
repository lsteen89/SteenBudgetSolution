import { FieldErrors } from 'react-hook-form';
import { Step5FormValues } from './Step5FormValues';

export interface StepBudgetFinalRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step5FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step5FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
}
