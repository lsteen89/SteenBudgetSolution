import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import type { ApiEnvelope } from '@/api/api.types';

/**
 * Verifies a user's email with the given token.
 * @param token The email verification token.
 * @throws Will throw an Error with a user-friendly message on failure.
 */
export const verifyEmail = async (token: string): Promise<void> => {
  try {
    const response = await api.get<ApiEnvelope<string>>(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    );

    const env = response.data;

    // 200 but envelope indicates failure
    if (!env.isSuccess || env.error || !env.data) {
      const message = env.error?.message ?? 'Email verification failed.';
      const customError = new Error(message);
      (customError as any).response = response;
      throw customError;
    }

    // Success – env.data contains something like "Email successfully verified."
    // You ignore it here, which is fine; caller just cares that it didn't throw.
    return;
  } catch (error) {
    if (isAxiosError<ApiEnvelope<string>>(error) && error.response) {
      const env = error.response.data;
      const message =
        env?.error?.message ??
        'Email verification failed.';

      const customError = new Error(message);
      (customError as any).response = error.response;
      throw customError;
    }

    // Network / non-Axios error
    throw new Error('Kunde inte ansluta till servern.');
  }
};
