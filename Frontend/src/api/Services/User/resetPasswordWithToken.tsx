import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import { validatePassword } from '@utils/validation/PasswordValidation';
import translate from '@utils/translate';
import type { ApiEnvelope } from '@/api/api.types';

interface ResetPasswordResponse {
  status: number;
  message: string;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    // Client-side validation → translate directly
    throw new ValidationError(translate(passwordError));
  }

  try {
    const response = await api.post<ApiEnvelope<string>>(
      '/api/UserManagement/reset-password-with-token',
      { token, password: newPassword, confirmPassword: newPassword }
    );

    const env = response.data;

    // 200 but envelope says failure
    if (!env.isSuccess || env.error || !env.data) {
      const backendMessage = env.error?.message ?? 'UNKNOWN_ERROR';
      const translatedMessage = translate(backendMessage);
      throw new Error(translatedMessage);
    }

    // Success: translate backend success message
    const translatedMessage = translate(env.data);

    return {
      status: response.status,
      message: translatedMessage,
    };
  } catch (error) {
    if (isAxiosError<ApiEnvelope<string>>(error) && error.response) {
      const env = error.response.data;
      const backendMessage = env?.error?.message ?? 'UNKNOWN_ERROR';
      const translatedMessage = translate(backendMessage);
      throw new Error(translatedMessage);
    }

    // Non-Axios / network type error
    throw new Error(translate('UNKNOWN_ERROR'));
  }
};
