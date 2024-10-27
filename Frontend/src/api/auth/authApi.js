import axios from '../axiosConfig'; 

/**
 * Register a new user
 * @param {Object} userData - The registration details for the new user
 * @returns {Promise} - Axios response promise
 */
export const registerUser = async (userData) => {
    try {
        const response = await axios.post('/api/Registration/register', userData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data; // Return the API response data

    } catch (error) {
        const errorMessage = error.response?.data?.message || `Failed to register user: ${error.response?.statusText || 'Unknown error'}`;
        throw new Error(errorMessage);
    }
};

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


