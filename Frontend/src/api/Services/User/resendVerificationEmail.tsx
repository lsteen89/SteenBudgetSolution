import axios from '../../axiosConfig';

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
    // Inline email validation
    if (
        !email?.trim() ||
        !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
    ) {
        throw new ValidationError('Ogiltig e-postadress. Kontrollera att du har angett en giltig adress.');
    }

    try {
        const response = await axios.post<ResendVerificationResponse>(
            '/api/Registration/resend-verification',
            { email }
        );
        return { status: response.status, message: response.data.message };
    } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Something went wrong';
        return { status, message };
    }
};
