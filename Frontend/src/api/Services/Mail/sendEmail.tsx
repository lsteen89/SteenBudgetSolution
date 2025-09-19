import { api } from '@/api/axios';
import { AxiosResponse } from 'axios';
import { EmailSubmissionDto } from '../../../types/User/Email/emailForm';

type ApiResponse<T> = { data: T; errorCode?: string; message?: string };

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

    const response: AxiosResponse<ApiResponse<string>> = await api.post(
      '/api/email/contact',
      emailData,
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Use the 'data' field from ApiResponse<T>
    return { status: response.status, message: response.data.data };
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.response?.data?.errorCode ||
      'Failed to submit contact form';
    console.error('Error submitting contact form:', error);
    return { status, message };
  }
};
