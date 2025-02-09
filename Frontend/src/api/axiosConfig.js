import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5000"
      : import.meta.env.VITE_API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop for refresh calls
    if (originalRequest.url === "/api/auth/refresh") {
      return Promise.reject(error);
    }

    // If we got 401, try refreshing once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt refresh
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        if (refreshResponse.data?.success) {
          // Retry original request with the new cookies
          return axiosInstance(originalRequest);
        }
      } catch {
        // If refresh fails, we do nothing special here
      }
    }

    // Critically, we do NOT do a window.location.href = "/login" here.
    // Just reject the promise, letting the AuthProvider handle it.
    return Promise.reject(error);
  }
);

export default axiosInstance;
