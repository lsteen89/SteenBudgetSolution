import axios from '../../axiosConfig';
import { isValidEmail } from '@utils/validation/emailValidation';

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
        const response = await axios.post<GenerateResetPasswordEmailResponse>(
            '/api/UserManagement/generate-reset-password-email',
            { email }
        );
        return {
            status: response.status,
            message: response.data.message,
        };
    } catch (error: any) {
        const status = error.response?.status || 500;

        // Handle specific HTTP errors
        if (status === 429) {
            throw new Error('För många försök. Vänta en stund och försök igen.');
        }
        const message = error.response?.data?.message || 'Ett fel har inträffat. Försök igen.';
        throw new Error(`Error ${status}: ${message}`);
    }
};
