import axios from 'axios';

// Set base URL for axios depending on the environment
const instance = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://ebudget.se',
});

export default instance;