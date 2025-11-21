import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import type { ApiEnvelope } from '@/api/api.types';
import type { UserCreationDto } from '../../../types/User/Creation/userCreation';

/**
 * Registers a new user
 * @param {UserCreationDto} user - The registration details for the new user
 * @returns {Promise<void>}
 * @throws Error with a clear message if registration fails.
 */
export const registerUser = async (user: UserCreationDto): Promise<void> => {
    try {
        const response = await api.post<ApiEnvelope<string>>(
            '/api/auth/register',
            user,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );

        const env = response.data;

        // 200 but envelope indicates failure
        if (!env.isSuccess || env.error || !env.data) {
            const message = env.error?.message ?? 'Registreringen misslyckades.';
            const customError = new Error(message);
            (customError as any).response = response;
            throw customError;
        }

        // Success → nothing to return
        return;
    } catch (error) {
        if (isAxiosError<ApiEnvelope<string>>(error) && error.response) {
            const env = error.response.data;
            const message =
                env?.error?.message ?? 'Registreringen misslyckades av okänd anledning.';
            const customError = new Error(message);
            (customError as any).response = error.response;
            throw customError;
        }

        throw new Error('Unable to connect to the server. Please try again.');
    }
};

export default registerUser;