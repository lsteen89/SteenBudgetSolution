import axios from '../../axiosConfig';
import { isValidEmail } from '@utils/validation/emailValidation';

interface ForgottenPasswordResponse {
    status: number;
    Token?: string;
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
): Promise<ForgottenPasswordResponse> => {
    if (!isValidEmail(email)) {
        throw new ValidationError('Invalid email address. Please provide a valid email.');
    }

    try {
        const response = await axios.post<ForgottenPasswordResponse>(
            '/api/Registration/forgot-password',
            { email }
        );
        return {
            status: response.status,
            Token: response.data.Token, // Include if relevant
            message: response.data.message,
        };
    } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'An error occurred. Please try again.';
        throw new Error(`Error ${status}: ${message}`);
    }
};
