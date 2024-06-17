// src/api/api.js
const API_URL = process.env.REACT_APP_API_URL;

export const registerUser = async (userData) => {
    const response = await fetch(`${API_URL}/Registration/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        throw new Error('Failed to register user');
    }
    return response.json();
};
