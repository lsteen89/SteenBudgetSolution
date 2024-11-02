import axios from '../../axiosConfig';

/**
 * Register a new user
 * @param {Object} userData - The registration details for the new user
 * @returns {Promise} - Axios response promise
 */
export const registerUser = async (userData) => {
    try {
        const response = await axios.post('/api/Registration/register', userData, {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to register user';
        throw new Error(errorMessage);
    }
};

export default registerUser;
