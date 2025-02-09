import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : import.meta.env.VITE_API_URL,
  withCredentials: true, // Important for sending/receiving secure cookies
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent retry loop on refresh endpoint
    if (originalRequest.url === "/api/auth/refresh") {
      return Promise.reject(error);
    }

    // If 401, try refresh once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt refresh with cookies
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        if (refreshResponse.data?.success) {
          // Retry original request once cookies are presumably updated
          return axiosInstance(originalRequest);
        }
      } catch {
        // Refresh failed, let the code below handle
      }

      // If refresh fails, or no success => log user out or redirect
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;