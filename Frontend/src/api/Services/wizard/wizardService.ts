import type { ApiEnvelope } from "@/api/api.types";
import { api } from "@/api/axios";
import { unwrapEnvelopeData } from "@/api/envelope";
import { CODE_DATA_VERSION } from "@/constants/wizardVersion";
import { WizardData } from "@/stores/Wizard/wizardDataStore";
import { StartWizardResponse } from "@/types/Wizard/Step0_Welcome/StartWizardResponse";
import type { BudgetDashboardDto } from "@myTypes/budget/BudgetDashboardDto";
import { isAxiosError } from "axios";

export interface WizardProgressDto {
  majorStep: number;
  subStep: number;
  maxSubStepByMajor: Record<number, number>; // backend is IReadOnlyDictionary<int,int>
}

export interface WizardDataResponseDto {
  wizardData: Partial<WizardData>;
  progress: WizardProgressDto;
  dataVersion: number;
}

/* ───── start wizard ───── */
export async function startWizard(): Promise<StartWizardResponse> {
  const response =
    await api.post<ApiEnvelope<StartWizardResponse>>("/api/wizard/start");
  const payload = unwrapEnvelopeData(
    response,
    "API Contract Error: startWizard missing 'wizardSessionId'.",
  );

  if (!payload.wizardSessionId) {
    console.error("Invalid API response from startWizard:", response.data);
    throw new Error(
      "API Contract Error: startWizard missing 'wizardSessionId'.",
    );
  }

  return payload;
}

/* ───── save wizard step ───── */
// BE: 204 NoContent on success, envelope on error → we just rely on throw if not 2xx.
export const saveWizardStep = async (
  sid: string,
  step: number,
  subStep: number,
  stepData: unknown,
  dataVersion: number = CODE_DATA_VERSION,
) => {
  const rid = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const snapshot = JSON.parse(JSON.stringify(stepData)); // freeze for logging

  console.groupCollapsed(
    "%c[API] saveWizardStep",
    "color:#22c55e;font-weight:bold",
  );
  console.log({ rid, sid, step, subStep, snapshot });
  console.trace("[API] call stack rid=" + rid);
  console.groupEnd();

  return api.put(`/api/wizard/${sid}/steps/${step}/${subStep}`, {
    stepData,
    dataVersion,
  });
};

/* ───── get wizard data ───── */
export const getWizardData = async (
  sid: string,
): Promise<WizardDataResponseDto | null> => {
  try {
    const res = await api.get<ApiEnvelope<WizardDataResponseDto | null>>(
      `/api/wizard/${sid}`,
    );

    const env = res.data;

    if (!env.isSuccess) {
      console.error(
        "Failed to load wizard data (envelope failure):",
        env.error,
      );
      throw new Error(env.error?.message ?? "Failed to load wizard data.");
    }

    // Success; data may be null if nothing saved yet
    return env.data ?? null;
  } catch (error) {
    if (
      isAxiosError<ApiEnvelope<WizardDataResponseDto | null>>(error) &&
      error.response
    ) {
      const status = error.response.status;

      // Wizard session not found → treat as "no wizard"
      if (status === 404) {
        return null;
      }

      const env = error.response.data;
      const msg = env?.error?.message ?? "Failed to load wizard data.";
      console.error("Failed to load wizard data (HTTP error):", status, env);
      throw new Error(msg);
    }

    throw new Error("Failed to load wizard data.");
  }
};

/* ───── complete wizard ───── */
// BE: 204 NoContent on success, envelope on error -> Axios throws on error.

export async function completeWizard(sessionId: string): Promise<void> {
  await api.post(`/api/wizard/${sessionId}/complete`);
}

/* ───── fetch finalization preview ───── */
export async function fetchWizardFinalizationPreview(
  sessionId: string,
): Promise<BudgetDashboardDto> {
  const res = await api.get<ApiEnvelope<BudgetDashboardDto>>(
    `/api/wizard/${sessionId}/finalization-preview`,
  );

  return unwrapEnvelopeData(res, "Could not load finalization preview.");
}
