import { api } from '@/api/axios';
import { StartWizardResponse } from '@myTypes/Wizard/StartWizardResponse';

export interface WizardDataResponseDto {
  wizardData: Record<number, any> | null;
  subStep: number;
}


export async function startWizard(): Promise<StartWizardResponse> {
  const { data } = await api.post<StartWizardResponse>("/api/Wizard/start");
  return data;
}

export async function saveWizardStep(
  wizardSessionId: string,
  stepNumber: number,
  subStepNumber: number,
  stepData: any
): Promise<void> {
  // PUT /api/wizard/steps/{stepNumber}
  await api.put(`/api/Wizard/steps/${stepNumber}`, {
    wizardSessionId,
    subStepNumber,
    stepData,
  });
}

export async function getWizardData(
  wizardSessionId: string
): Promise<WizardDataResponseDto> {
  const { data } = await api.post<WizardDataResponseDto>(
    "/api/Wizard/data",
    { wizardSessionId }
  );
  return data;
}
