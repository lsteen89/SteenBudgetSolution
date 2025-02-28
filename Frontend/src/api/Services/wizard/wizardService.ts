import axiosInstance from "@api/axiosConfig";

export interface StartWizardResponse {
  wizardSessionId: string; // Empty string if session creation failed
  message: string;
}

export async function startWizard(): Promise<StartWizardResponse> {
  const { data } = await axiosInstance.post<StartWizardResponse>("/api/Wizard/start");
  return data;
}

export async function saveWizardStep(
  wizardSessionId: string,
  stepNumber: number,
  stepData: any
): Promise<void> {
  // PUT /api/wizard/steps/{stepNumber}
  await axiosInstance.put(`/api/Wizard/steps/${stepNumber}`, {
    wizardSessionId,
    stepData,
  });
}

export async function getWizardData(wizardSessionId: string): Promise<any> {
  // GET /api/wizard?wizardSessionId=XYZ
  const { data } = await axiosInstance.get(`/api/Wizard`, {
    params: { wizardSessionId },
  });
  return data;
}
