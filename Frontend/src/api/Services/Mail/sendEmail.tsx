import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import type { EmailSubmissionDto } from '../../../types/User/Email/emailForm';
import type { ApiEnvelope } from '@/api/api.types';

export interface EmailResponse {
  status: number;
  message: string;
}

export const sendEmail = async (
  emailData: EmailSubmissionDto
): Promise<EmailResponse> => {
  try {
    console.log('Request Method:', 'POST');
    console.log('Request URL:', `${api.defaults.baseURL}/api/email/contact`);

    // Backend: ApiEnvelope<string>
    const response = await api.post<ApiEnvelope<string>>(
      '/api/email/contact',
      emailData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const env = response.data;

    // 200 but business failure inside envelope
    if (!env.isSuccess || !env.data || env.error) {
      return {
        status: response.status,
        message: env.error?.message ?? 'Failed to submit contact form',
      };
    }

    // 200 + success
    return {
      status: response.status,
      message: env.data, // "Message received."
    };
  } catch (error) {
    console.error('Error submitting contact form:', error);

    if (isAxiosError<ApiEnvelope<string>>(error)) {
      const status = error.response?.status ?? 500;
      const env = error.response?.data;

      return {
        status,
        message: env?.error?.message ?? 'Failed to submit contact form',
      };
    }

    // Non-Axios or weird error
    return {
      status: 500,
      message: 'Failed to submit contact form',
    };
  }
};
