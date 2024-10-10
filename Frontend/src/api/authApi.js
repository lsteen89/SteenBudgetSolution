import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL; // The base URL for your backend API

export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/api/Registration/register`, userData, {
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

// Function to send verification email
export const sendVerificationEmail = async (email) => {
    try {
        const response = await axios.post(`${API_URL}/api/Email/SendVerification`, { email });
        return response.data;
    } catch (error) {
        const errorMessage = `Failed to send verification email: ${error.response?.statusText || 'Unknown error'}`;
        throw new Error(errorMessage);
    }
};
