import axios from '../../axiosConfig';
/**
 * Verify email address using token
 * @param {string} token - The verification token from the query parameter
 * @returns {Promise} - Axios response promise
 */
export const verifyEmail = async (token) => {
    try {
        const response = await axios.get(`/api/Registration/verify-email?token=${token}`);
        return response.data; // Return the API response data if needed
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'Invalid or expired token.';
        throw new Error(errorMessage);
    }
};