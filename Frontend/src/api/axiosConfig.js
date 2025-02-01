import axios from 'axios';


// Create an Axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:5000' 
    : import.meta.env.VITE_API_URL, 
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to add the JWT token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors (Optional: Implement token refresh if supported)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Implement refresh token logic here if your backend supports it
      // For example:
      /*
      try {
        const refreshResponse = await axiosInstance.post<LoginResponse>('/api/Auth/refresh', { refreshToken });
        if (refreshResponse.data.success) {
          const newAccessToken = refreshResponse.data.accessToken;
          localStorage.setItem('accessToken', newAccessToken);
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        window.location.href = '/login';
      }
      */

      // No refresh token available or refresh request failed. Redirect to login
      // todo: Implement refresh token logic
      // Remove expired tokens before redirecting
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axiosInstance.defaults.headers.common['Authorization'];

      // Optional: Log token removal for debugging
      console.warn('Token expired. Clearing tokens and redirecting to login.');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;