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

    // If 401 and request hasn't been retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log("Access token expired. Attempting refresh via cookies.");
        // Call refresh endpoint without sending tokens in the body.
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        
        if (refreshResponse.data && refreshResponse.data.success) {
          console.log("Token refresh succeeded.");
          // The new tokens are set as HttpOnly cookies automatically.
          return axiosInstance(originalRequest);
        } else {
          console.warn("Token refresh failed:", refreshResponse.data.message);
        }
      } catch (refreshError) {
        console.error("Token refresh error:", refreshError);
      }
      // Redirect to login on failure
      console.warn("Redirecting to login due to token refresh failure.");
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;