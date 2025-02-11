import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : import.meta.env.VITE_API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if we're already refreshing
    if (originalRequest.url === "/api/auth/refresh") {
      return Promise.reject(error);
    }

    // If unauthorized and we haven't tried refresh yet:
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt token refresh
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        if (refreshResponse.data?.success) {
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch {
        // If refresh fails, just reject.
        // The AuthProvider will eventually handle logout.
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
