import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import type { AuthState, AuthContextType } from "../types/authTypes";
import { useLocation } from "react-router-dom";

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

  const wsRef = useRef<WebSocket | null>(null);
  const location = useLocation();

  /**
   * 1. Define your protected routes. If the user is on one of these
   *    and /api/auth/status returns 401, we will redirect them to /login.
   */
  const protectedRoutes = ["/dashboard"];
  const isProtectedRoute = protectedRoutes.includes(location.pathname);

  /**
   * Close the WebSocket, if any
   */
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Open a WebSocket if user is authenticated. If server sends "logout" or
   * "session-expired," we do a forced redirect to /login.
   */
  const openWebSocket = useCallback(() => {
    const websocketUrl =
      import.meta.env.MODE === "development"
        ? "ws://localhost:5000/ws/auth"
        : "wss://ebudget.se/ws/auth";

    const connect = (attempt = 1) => {
      console.log(`AuthProvider: Attempting WebSocket connection (attempt ${attempt})...`);
      const socket = new WebSocket(websocketUrl);

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
          window.location.href = "/login"; // Force user to re-login
        }
      };

      socket.onclose = () => {
        console.log("AuthProvider: WebSocket closed.");
        wsRef.current = null;

        // Try reconnecting up to 3 times if user is still authenticated
        if (authState.authenticated && attempt < 3) {
          setTimeout(() => connect(attempt + 1), 5000);
        }
      };

      socket.onerror = (err) => {
        console.error("AuthProvider: WebSocket error:", err);
      };
    };

    connect();
  }, [authState.authenticated, closeWebSocket]);

  /**
   * 2. Call the /api/auth/status endpoint to check if user is authenticated.
   *    If we get 401 and we're on a protected route, we redirect to /login.
   */
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
      console.log("AuthProvider: Status response:", response.data);

      setAuthState({ ...response.data, isLoading: false });

      // If authenticated, ensure WebSocket is open
      if (response.data.authenticated && !wsRef.current) {
        openWebSocket();
      } else if (!response.data.authenticated) {
        closeWebSocket();
      }
    } catch (error) {
      // 401 => user is not authenticated
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log("AuthProvider: User is not authenticated.");

        // If user is on a protected route, do a forced redirect
        if (isProtectedRoute) {
          console.log("AuthProvider: Protected route => logging out and redirecting to /login");
          try {
              await axiosInstance.post("/api/auth/logout");
          } catch (logoutError) {
              console.error("Error during logout call:", logoutError);
          }
          window.location.href = "/login";
      }

        setAuthState({ authenticated: false, isLoading: false });
        closeWebSocket();
        return;
      }

      // Other errors => just log + set user to not authenticated
      console.error("AuthProvider: Unexpected error:", error);
      setAuthState({ authenticated: false, isLoading: false });
      closeWebSocket();
    }
  }, [closeWebSocket, openWebSocket, isProtectedRoute]);

  /**
   * 3. Logout explicitly calls /api/auth/logout, closes WebSocket, and sets state
   */
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("AuthProvider: Logout successful.");
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }
    setAuthState({ authenticated: false, isLoading: false });
    closeWebSocket();
    window.location.href = "/login"; // redirect to login
  }, [closeWebSocket]);

  /**
   * 4. On mount (and whenever fetchAuthStatus changes), call /api/auth/status
   */
  useEffect(() => {
    fetchAuthStatus();
    return () => {
      closeWebSocket();
    };
  }, [fetchAuthStatus, closeWebSocket]);

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
      {authState.isLoading ? (
        <div>Loading...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
