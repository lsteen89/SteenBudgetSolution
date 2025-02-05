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

    // If the response status is 401 and the request hasn't been retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");
      const userId = localStorage.getItem("userId");
      
      if (refreshToken && userId) {
        try {
          console.log("Access token expired. Attempting refresh for user:", userId);
          const refreshResponse = await axiosInstance.post("/api/auth/refresh", { 
            userId, 
            refreshToken 
          });
          
          if (refreshResponse.data && refreshResponse.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
            console.log("Token refresh succeeded. New Access Token:", accessToken);
            // Update local storage and retry original request
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
            originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
            return axiosInstance(originalRequest);
          } else {
            console.warn("Token refresh failed:", refreshResponse.data.message);
          }
        } catch (refreshError) {
          console.error("Token refresh error:", refreshError);
        }
      } else {
        console.warn("No refresh token or user ID found.");
      }
      // Clear tokens and redirect if refresh fails
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete axiosInstance.defaults.headers.common["Authorization"];
      console.warn("Redirecting to login due to token refresh failure.");
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;