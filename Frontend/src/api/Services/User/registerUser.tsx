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
            // Log the full response for debugging
            console.error("Backend Response Error:", error.response);


            const errorMessage = error.response.data?.message || 'Internt fel, försök igen';

            // Throw the full error object with additional context
            throw {
                ...error, // Preserve the original Axios error
                message: errorMessage, // Override the message
            };
        } else {
            // If there's no response, it's likely a network error
            console.error("Network Error:", error);
            throw new Error("Unable to connect to the server. Please try again later.");
        }
    }
};

export default registerUser;