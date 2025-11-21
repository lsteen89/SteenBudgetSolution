import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import { isValidEmail } from '@utils/validation/emailValidation';
import type { ApiEnvelope } from '@/api/api.types';

interface ResendVerificationResponse {
    status: number;
    message: string;
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export const resendVerificationEmail = async (
    email: string
): Promise<ResendVerificationResponse> => {
    if (!isValidEmail(email)) {
        throw new ValidationError(
            'Invalid email address. Please provide a valid email.'
        );
    }

    try {
        const response = await api.post<ApiEnvelope<string>>(
            '/api/auth/resend-verification',   // <-- note: auth, not UserManagement
            { email }
        );

        const env = response.data;

        // 200 but envelope indicates failure
        if (!env.isSuccess || env.error || !env.data) {
            return {
                status: response.status,
                message: env.error?.message ?? 'Something went wrong',
            };
        }

        // success: env.data is your success message
        return {
            status: response.status,
            message: env.data,
        };
    } catch (error) {
        if (isAxiosError<ApiEnvelope<string>>(error) && error.response) {
            const status = error.response.status ?? 500;
            const env = error.response.data;

            return {
                status,
                message: env?.error?.message ?? 'Something went wrong',
            };
        }

        return {
            status: 500,
            message: 'Something went wrong',
        };
    }
};
