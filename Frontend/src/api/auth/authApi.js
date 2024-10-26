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
        const response = await axios.post('/api/auth/resend-verification', { email }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data; // Return the API response data

    } catch (error) {
        const errorMessage = error.response?.data?.message || `Failed to resend verification email: ${error.response?.statusText || 'Unknown error'}`;
        throw new Error(errorMessage);
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
