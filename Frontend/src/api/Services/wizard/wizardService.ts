import { api } from '@/api/axios';
import { StartWizardResponse } from '@myTypes/Wizard/StartWizardResponse';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { WizardData } from '@/stores/Wizard/wizardDataStore';
import { ApiResponse } from '@/api/api.types';


export interface WizardDataResponseDto {
  wizardData: Partial<WizardData>;
  subStep: number | null;
  dataVersion: number;
}

// Function to start a new wizard session
export async function startWizard(): Promise<StartWizardResponse> {
  const response = await api.post<ApiResponse<StartWizardResponse> | StartWizardResponse>("/api/Wizard/start");

  const payload: any = (response.data as any)?.data ?? response.data;

  if (!payload || !payload.wizardSessionId) {
    console.error("Invalid API response from startWizard:", response.data);
    throw new Error("API Contract Error: startWizard missing 'wizardSessionId'.");
  }

  return payload as StartWizardResponse;
}

// Function to save the current step data in the wizard session
export const saveWizardStep = async (
  sid: string,
  step: number,
  subStep: number,
  stepData: unknown,
  dataVersion: number = CODE_DATA_VERSION
) => {
  return api.put(
    `/api/wizard/${sid}/steps/${step}/${subStep}`,
    { stepData, dataVersion }
  );
};

export const getWizardData = async (
  sid: string
): Promise<WizardDataResponseDto | null> => {
  // After your interceptor, res.data is already the payload (WizardDataResponseDto | null)
  const res = await api.get<WizardDataResponseDto | null>(`/api/wizard/${sid}`);
  return res.data ?? null;
};

export async function completeWizard(sessionId: string): Promise<void> {
  console.log(`Completing wizard session with ID: ${sessionId}`);
  // POST /api/wizard/{sessionId}/complete
  await api.post(`/api/wizard/${sessionId}/complete`);
}
