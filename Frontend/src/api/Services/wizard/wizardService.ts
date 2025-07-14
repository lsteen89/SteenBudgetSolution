import { api } from '@/api/axios';
import { StartWizardResponse } from '@myTypes/Wizard/StartWizardResponse';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { WizardData } from '@/stores/Wizard/wizardDataStore';

export interface WizardDataResponseDto {
  wizardData: Partial<WizardData>;   
  subStep: number | null;
  dataVersion: number;
}

// Function to start a new wizard session
export async function startWizard(): Promise<StartWizardResponse> {
  const { data } = await api.post<StartWizardResponse>("/api/Wizard/start");
  return data;
}

// Function to save the current step data in the wizard session
export const saveWizardStep = async (
  sid: string,
  step: number,
  subStep: number,
  stepData: unknown,
  dataVersion: number = CODE_DATA_VERSION
) =>
  api.put(`/api/wizard/${sid}/steps/${step}/${subStep}`, {
    stepData,
    dataVersion,
  });

// Function to get the current wizard data for a specific session
export const getWizardData = async (sid: string) =>
  api.get<WizardDataResponseDto>(`/api/wizard/${sid}`).then(r => r.data);

// Function to finalize the wizard session
export async function completeWizard(sessionId: string): Promise<void> {
  console.log(`Completing wizard session with ID: ${sessionId}`);
  // POST /api/Wizard/{sessionId}/complete
  await api.post(`/api/Wizard/${sessionId}/complete`);
}
