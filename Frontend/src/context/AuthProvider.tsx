import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import type { AuthState, AuthContextType } from "../types/authTypes";
import { useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  exp?: number;
  [key: string]: any;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({
    authenticated: false,
    isLoading: true,
  });

  // Prevent multiple logout calls
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  // Keep track of ongoing token refresh request
  let refreshPromise: Promise<void> | null = null;

  const wsRef = useRef<WebSocket | null>(null);
  const location = useLocation();

  /**
   * Logs out the user by calling the backend logout endpoint,
   * resetting local storage, and closing any open WebSockets.
   */
  const logout = useCallback(async () => {
    if (hasLoggedOut) return;
    setHasLoggedOut(true);

    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("AuthProvider: Logout successful.");
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }

    setAuthState({ authenticated: false, isLoading: false });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    axiosInstance.defaults.headers.common["Authorization"] = "";
    closeWebSocket();

    setHasLoggedOut(false);
  }, [hasLoggedOut]);

  /**
   * Attempts to refresh the access token using the refresh token.
   * If successful, updates local storage and Axios defaults. Otherwise, logs out.
   */
  const refreshAccessToken = async () => {
    const userId = localStorage.getItem("userId");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!userId || !refreshToken) {
      console.warn("No refresh token found. Logging out.");
      logout();
      return;
    }

    try {
      const res = await axiosInstance.post("/api/auth/refresh", {
        userId,
        refreshToken,
      });

      if (res.data.success) {
        console.log("Token refresh succeeded. Updating tokens.");
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${res.data.accessToken}`;
      } else {
        console.warn("Refresh token request failed. Logging out.");
        logout();
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      logout();
    }
  };

  /**
   * Closes the current WebSocket connection, if any.
   */
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Opens a WebSocket connection if an access token is available.
   */
  const openWebSocket = useCallback(() => {
    const websocketUrl =
      import.meta.env.MODE === "development"
        ? "ws://localhost:5000/ws/auth"
        : "wss://ebudget.se/ws/auth";

    const connect = (attempt = 1) => {
      console.log(`AuthProvider: Attempting WebSocket connection (attempt ${attempt})...`);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.warn("AuthProvider: No access token found. Cannot establish WebSocket connection.");
        return;
      }
      const socket = new WebSocket(`${websocketUrl}?token=${encodeURIComponent(token)}`);

      socket.onopen = () => {
        console.log("AuthProvider: WebSocket connected.");
        wsRef.current = socket;
      };

      socket.onmessage = (event) => {
        console.log(`AuthProvider: Received WS message: ${event.data}`);
        if (event.data === "ready") {
          console.log("AuthProvider: WebSocket is ready!");
        } else if (event.data === "ping") {
          console.log("AuthProvider: Received ping from server.");
        } else if (event.data === "logout" || event.data === "session-expired") {
          console.log("AuthProvider: Received logout/session-expired from server.");
          setAuthState({ authenticated: false, isLoading: false });
          closeWebSocket();
          window.location.href = "/login";
        }
      };

      socket.onclose = () => {
        console.log("AuthProvider: WebSocket closed.");
        wsRef.current = null;
        if (authState.authenticated && attempt < 3) {
          setTimeout(() => connect(attempt + 1), 5000); // Retry after 5 seconds
        }
      };

      socket.onerror = (err) => {
        console.error("AuthProvider: WebSocket error:", err);
      };
    };

    connect();
  }, [authState.authenticated, closeWebSocket]);

  /**
   * Fetches the user's auth status from the backend (/api/auth/status).
   * If authenticated, ensures a WebSocket is open. Otherwise, closes any open WebSocket.
   */
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
      console.log("AuthProvider: Status response:", response.data);
      setAuthState({ ...response.data, isLoading: false });

      if (response.data.authenticated && !wsRef.current) {
        openWebSocket();
      } else if (!response.data.authenticated) {
        closeWebSocket();
      }
    } catch (error) {
      if (isAxiosError(error)) {
        console.error("AuthProvider: Axios error:", error.response?.status, error.response?.data);
      } else {
        console.error("AuthProvider: Unexpected error:", error);
      }
      setAuthState({ authenticated: false, isLoading: false });
      closeWebSocket();
    }
  }, [closeWebSocket, openWebSocket]);

  /**
   * Axios Response Interceptor:
   *  - Catches 401 errors, attempts to refresh token, and retries once if successful.
   */
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // If a refresh is already in progress, wait for it
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        try {
          await refreshPromise;
          return axiosInstance(originalRequest); // Retry the failed request
        } catch (refreshError) {
          console.error("Token refresh failed via Axios interceptor:", refreshError);
          logout();
        }
      }

      return Promise.reject(error);
    }
  );

  /**
   * On mount, set the Authorization header if an access token exists, then fetch auth status.
   */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchAuthStatus();
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }

    return () => {
      closeWebSocket();
    };
  }, [fetchAuthStatus, closeWebSocket]);

  /**
   * Effect that runs on every route change:
   * Checks if the access token is close to expiring or already expired,
   * and calls refresh if needed.
   */
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!token || !refreshToken) {
      console.warn("No access or refresh token found. Logging out.");
      logout();
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiryTime = decoded.exp ? decoded.exp * 1000 : 0;
      const timeRemaining = expiryTime - Date.now();

      if (timeRemaining <= 0) {
        console.log("Access token expired. Attempting refresh...");
        refreshAccessToken();
      } else if (timeRemaining < 60000) {
        console.log(`Token expires in ${Math.round(timeRemaining / 1000)}s. Refreshing early...`);
        refreshAccessToken();
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      logout();
    }
  }, [location]);

  /**
   * Background check every 5 minutes to ensure tokens stay fresh even if user is idle.
   */
  useEffect(() => {
    if (!authState.authenticated) return;

    const interval = setInterval(() => {
      console.log("Running background token refresh check...");
      refreshAccessToken();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [authState.authenticated]);

  return (
    <AuthContext.Provider
      value={{
        authenticated: authState.authenticated,
        email: authState.email,
        role: authState.role,
        refreshAuthStatus: fetchAuthStatus,
        logout,
        isLoading: authState.isLoading, 
      }}
    >
      {authState.isLoading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};
