import { api } from '@/api/axios';
import { isValidEmail } from '@utils/validation/emailValidation';
import type { ApiEnvelope } from '@/api/api.types';
import { isAxiosError } from 'axios';

interface GenerateResetPasswordEmailResponse {
    status: number;
    message: string;
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Sends a request to generate and send a password reset email to the provided email address.
 * @param email The email address to send the reset password email to.
 * @returns A response object containing the status and message from the server.
 * @throws ValidationError if the email is invalid.
 * @throws Error if the server returns an error response.
 */
export const generateResetPasswordEmail = async (
    email: string
): Promise<GenerateResetPasswordEmailResponse> => {
    if (!isValidEmail(email)) {
        throw new ValidationError('Ogiltig epost, vänligen dubbelkolla!.');
    }

    try {
        const response = await api.post<ApiEnvelope<string>>(
            '/api/UserManagement/generate-reset-password-email',
            { email }
        );

        const env = response.data;

        // 200 but envelope says failure
        if (!env.isSuccess || !env.data || env.error) {
            const msg = env.error?.message ?? 'Ett fel har inträffat. Försök igen.';
            throw new Error(`Error ${response.status}: ${msg}`);
        }

        // 200 + success
        return {
            status: response.status,
            message: env.data, // e.g. "Reset email sent" etc
        };
    } catch (error) {
        if (isAxiosError<ApiEnvelope<string>>(error)) {
            const status = error.response?.status ?? 500;

            if (status === 429) {
                throw new Error('För många försök. Vänta en stund och försök igen.');
            }

            const env = error.response?.data;
            const msg =
                env?.error?.message ?? 'Ett fel har inträffat. Försök igen.';

            throw new Error(`Error ${status}: ${msg}`);
        }

        // Non-Axios or totally unexpected
        throw new Error('Ett fel har inträffat. Försök igen.');
    }
};
