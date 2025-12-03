import { api } from '@/api/axios';
import { StartWizardResponse } from '@myTypes/Wizard/StartWizardResponse';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { useWizardDataStore, WizardData } from '@/stores/Wizard/wizardDataStore';
import type { ApiEnvelope } from '@/api/api.types';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/Auth/authStore';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';

export interface WizardDataResponseDto {
  wizardData: Partial<WizardData>;
  subStep: number | null;
  dataVersion: number;
}

/* ───── start wizard ───── */
export async function startWizard(): Promise<StartWizardResponse> {
  const response = await api.post<ApiEnvelope<StartWizardResponse>>(
    '/api/wizard/start'
  );

  const env = response.data;

  if (!env.isSuccess || !env.data || env.error) {
    console.error('startWizard failed:', env);
    const msg =
      env.error?.message ??
      "API Contract Error: startWizard missing 'wizardSessionId'.";
    throw new Error(msg);
  }

  const payload = env.data;

  if (!payload.wizardSessionId) {
    console.error('Invalid API response from startWizard:', env);
    throw new Error("API Contract Error: startWizard missing 'wizardSessionId'.");
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
  dataVersion: number = CODE_DATA_VERSION
) => {
  const rid = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const snapshot = JSON.parse(JSON.stringify(stepData)); // freeze for logging

  console.groupCollapsed('%c[API] saveWizardStep', 'color:#22c55e;font-weight:bold');
  console.log({ rid, sid, step, subStep, snapshot });
  console.trace('[API] call stack rid=' + rid);
  console.groupEnd();

  return api.put(
    `/api/wizard/${sid}/steps/${step}/${subStep}`,
    { stepData, dataVersion }
  );
};

/* ───── get wizard data ───── */
export const getWizardData = async (
  sid: string
): Promise<WizardDataResponseDto | null> => {
  try {
    const res = await api.get<ApiEnvelope<WizardDataResponseDto | null>>(
      `/api/wizard/${sid}`
    );

    const env = res.data;

    if (!env.isSuccess) {
      console.error('Failed to load wizard data (envelope failure):', env.error);
      throw new Error(env.error?.message ?? 'Failed to load wizard data.');
    }

    // Success; data may be null if nothing saved yet
    return env.data ?? null;
  } catch (error) {
    if (isAxiosError<ApiEnvelope<WizardDataResponseDto | null>>(error) && error.response) {
      const status = error.response.status;

      // Wizard session not found → treat as "no wizard"
      if (status === 404) {
        return null;
      }

      const env = error.response.data;
      const msg = env?.error?.message ?? 'Failed to load wizard data.';
      console.error('Failed to load wizard data (HTTP error):', status, env);
      throw new Error(msg);
    }

    throw new Error('Failed to load wizard data.');
  }
};

/* ───── complete wizard ───── */
// BE: 204 NoContent on success, envelope on error -> Axios throws on error.

export async function completeWizard(sessionId: string): Promise<void> {
  console.log(`[Wizard] Completing wizard session with ID: ${sessionId}`);

  try {
    await api.post(`/api/wizard/${sessionId}/complete`);

    // Mirror backend changes in FE state
    const auth = useAuthStore.getState();
    const wizard = useWizardDataStore.getState();
    const wizardSession = useWizardSessionStore.getState();

    auth.markFirstLoginComplete();
    wizard.reset();
    wizardSession.clear?.();

    console.log(
      '[Wizard] Wizard completed successfully. firstLogin set to false and wizard-form-data-storage cleared.'
    );
  } catch (error) {
    console.error('[Wizard] Failed to complete wizard.', error);
    throw error; // keep behavior: caller handles error
  }
}
