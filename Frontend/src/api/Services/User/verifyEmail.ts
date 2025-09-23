import { api } from '@/api/axios';

/**
 * Verifies a user's email with the given token.
 * @param token The email verification token.
 * @throws Will throw an Error with a user-friendly message on failure.
 */
export const verifyEmail = async (token: string): Promise<void> => {
  try {
    // Using POST is slightly better practice for an action that changes state.
    await api.get(`/api/auth/verify-email?token=${token}`);
  } catch (error: any) {
    if (error.response) {
      // Standardize on the error format from your backend: { code, description }
      const message = error.response.data?.description || 'Email verification failed.';
      const customError = new Error(message);
      (customError as any).response = error.response; // Preserve original response
      throw customError;
    } else {
      // Handle network errors
      throw new Error('Kunde inte ansluta till servern.');
    }
  }
};