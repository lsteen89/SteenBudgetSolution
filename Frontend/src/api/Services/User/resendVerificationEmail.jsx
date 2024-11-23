import axios from '../../axiosConfig';

/**
 * Resend verification email
 * @param {string} email - The email address to resend the verification link to
 * @returns {Promise} - Axios response promise
 */

export const resendVerificationEmail = async (email) => {
    try {
        const response = await axios.post('/api/Registration/resend-verification', { email });
        return { status: response.status, message: response.data.message };
    } catch (error) {
        // If the response has an error status (e.g., 429), catch it here
        const status = error.response?.status;
        const message = error.response?.data?.message || 'Something went wrong';
        return { status, message }; // Return status and message to handle in React
    }
};