import axios from '../../axiosConfig';
import { isValidEmail } from '@utils/validation/emailValidation';

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
        throw new ValidationError('Invalid email address. Please provide a valid email.');
    }


    try {
        const response = await axios.post<ResendVerificationResponse>(
            '/api/UserManagement/resend-verification',
            { email }
        );
        return { status: response.status, message: response.data.message };
    } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Something went wrong';
        return { status, message };
    }
};
