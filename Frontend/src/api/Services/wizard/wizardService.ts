import axiosInstance from "@api/axiosConfig";

interface StartWizardResponse {
  wizardSessionId: string;
}

export async function startWizard(): Promise<string> {
  // POST /api/wizard/start - server creates new session
  const { data } = await axiosInstance.post<StartWizardResponse>("/api/wizard/start");
  return data.wizardSessionId;
}

export async function saveWizardStep(
  wizardSessionId: string,
  stepNumber: number,
  stepData: any
): Promise<void> {
  // PUT /api/wizard/steps/{stepNumber}
  await axiosInstance.put(`/api/wizard/steps/${stepNumber}`, {
    wizardSessionId,
    stepData,
  });
}

export async function getWizardData(wizardSessionId: string): Promise<any> {
  // GET /api/wizard?wizardSessionId=XYZ
  const { data } = await axiosInstance.get(`/api/wizard`, {
    params: { wizardSessionId },
  });
  return data; // shape depends on your backend response
}
