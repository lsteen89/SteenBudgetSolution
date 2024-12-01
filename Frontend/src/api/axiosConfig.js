import axios from 'axios';

// Set base URL for axios depending on the environment
const instance = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:5000'
    : import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export default instance;