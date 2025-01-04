import axios from '../../axiosConfig';
import { validatePassword } from "@utils/validation/PasswordValidation";

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
      throw new ValidationError(passwordError);
    }
    if (passwordError) {
        throw new ValidationError(passwordError);
    }

    try {
        const response = await axios.post<ResetPasswordResponse>(
            '/api/Auth/reset-password-with-token',
            { token, password: newPassword, confirmPassword: newPassword }
        );

        return {
            status: response.status,
            message: response.data.message,
        };
    } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'An error occurred. Please try again.';
        throw new Error(`Error ${status}: ${message}`);
    }
};
