import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL; // The base URL for your backend API

// Refactor registerUser to use axios
export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/Registration/register`, userData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        return response.data; // Return the API response data

    } catch (error) {
        // Throw a descriptive error if the request fails
        throw new Error(error.response?.data?.message || 'Failed to register user');
    }
};
// Function to send verification email
export const sendVerificationEmail = async (emailData) => {
    try {
        const response = await axios.post(`${API_URL}/email/send-verification`, emailData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to send verification email');
    }
};