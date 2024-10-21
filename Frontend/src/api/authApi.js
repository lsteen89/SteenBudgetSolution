import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL; // The base URL for the backend API

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
