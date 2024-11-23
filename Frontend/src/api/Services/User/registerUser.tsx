import axios from '../../axiosConfig';
import { UserCreationDto } from '../../../types/User';

/**
 * Registers a new user
 * @param {UserCreationDto} user - The registration details for the new user
 * @returns {Promise<void>} - Axios response promise
 * @throws Will throw an error if registration fails with a message from the backend or a default message.
 */
export const registerUser = async (user: UserCreationDto): Promise<void> => {
    try {
        await axios.post('/api/Registration/register', user, {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        // Capture specific error message from backend or use a generic one
        const errorMessage = error.response?.data?.message || 'Internt fel, försök igen';
        throw new Error(errorMessage);
    }
};

export default registerUser;
