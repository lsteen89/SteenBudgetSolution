import { api } from '@/api/axios';
import { UserCreationDto } from '../../../types/User/Creation/userCreation';

/**
 * Registers a new user
 * @param {UserCreationDto} user - The registration details for the new user
 * @returns {Promise<void>} - Axios response promise
 * @throws Will throw an error object containing detailed response data if registration fails.
 */
export const registerUser = async (user: UserCreationDto): Promise<void> => {
    try {
        await api.post('/api/auth/register', user, {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {

        if (error.response) {
            // Extract a clear error message from the backend response.
            // The backend sends { code: "...", description: "..." }, so we use description.
            const message = error.response.data?.message || 'An unknown error occurred.';
            // Create a new error with a clean message and attach the original response for context.
            const customError = new Error(message);
            (customError as any).response = error.response; // Keep the original response data
            throw customError;

        } else {
            // Handle network errors or other issues where there's no response.
            throw new Error('Unable to connect to the server. Please try again.');
        }
    }
};

export default registerUser;