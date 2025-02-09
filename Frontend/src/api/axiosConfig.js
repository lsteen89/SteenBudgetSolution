import axios from 'axios';


// Create an Axios instance
const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:5000' 
    : import.meta.env.VITE_API_URL, 
    withCredentials: true, // Send cookies when cross-origin requests
});

// Response interceptor to handle 401 errors (and attempt token refresh)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid interceptor on the refresh endpoint to prevent looping.
    if (originalRequest.url === '/api/auth/refresh') {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        if (refreshResponse.data && refreshResponse.data.success) {
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Handle refresh error
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;