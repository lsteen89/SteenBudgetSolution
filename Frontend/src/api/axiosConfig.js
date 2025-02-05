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

// Response interceptor to handle 401 errors (and attempt token refresh)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is due to a 401 and if we haven't retried this request already
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const userId = localStorage.getItem('userId'); // Ensure you store the user ID on login

      if (refreshToken && userId) {
        try {
          console.log("Attempting to refresh token for user:", userId);
          // Call your refresh endpoint. Adjust the DTO shape as needed.
          const refreshResponse = await axiosInstance.post("/api/auth/refresh", { 
            userId, 
            refreshToken 
          });
          
          if (refreshResponse.data && refreshResponse.data.success) {
            const newAccessToken = refreshResponse.data.accessToken;
            const newRefreshToken = refreshResponse.data.refreshToken;
            console.log("Token refresh succeeded. New Access Token:", newAccessToken);
            
            // Update tokens in local storage and default headers
            localStorage.setItem("accessToken", newAccessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

            // Retry the original request with the new access token
            return axiosInstance(originalRequest);
          } else {
            console.error("Token refresh failed with message:", refreshResponse.data.message);
          }
        } catch (refreshError) {
          console.error("Token refresh error:", refreshError);
        }
      } else {
        console.warn("No refresh token or userId found in localStorage.");
      }
      
      // If refresh fails, remove tokens and redirect to login
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete axiosInstance.defaults.headers.common["Authorization"];
      console.warn("Token expired or refresh failed. Clearing tokens and redirecting to login.");
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;