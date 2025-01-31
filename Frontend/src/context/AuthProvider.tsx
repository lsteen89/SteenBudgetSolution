import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import type { AuthState, AuthContextType } from "../types/authTypes"; 
import { useLocation } from "react-router-dom"; // Import useLocation

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({ authenticated: false, isLoading: true });
  const wsRef = useRef<WebSocket | null>(null);
  const location = useLocation(); // Get current location

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Define protected routes
  const protectedRoutes = ['/dashboard']; // Add other protected routes as needed

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.includes(location.pathname);

  // Fetch auth status
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
      console.log("AuthProvider: Status response:", response.data);
      setAuthState({ ...response.data, isLoading: false });

      if (response.data.authenticated && !wsRef.current) {
        // If user is authenticated and no WebSocket is open yet, open now
        openWebSocket();
      } else if (!response.data.authenticated) {
        // If user is not authenticated, close any existing socket
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
  }, [closeWebSocket]);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout"); // Removed withCredentials since cookies are not used
      console.log("AuthProvider: Logout successful.");
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }
    setAuthState({ authenticated: false, isLoading: false });
    closeWebSocket();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    axiosInstance.defaults.headers.common['Authorization'] = '';
  }, [closeWebSocket]);

  // WebSocket opener
  const openWebSocket = useCallback(() => {
    const websocketUrl = import.meta.env.MODE === "development"
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
        } else if (event.data === "logout" || event.data === "session-expired") {
          console.log("AuthProvider: Received logout/session-expired from server.");
          setAuthState({ authenticated: false, isLoading: false });
          closeWebSocket();
          window.location.href = "/login"; // Redirect to login page
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

  // On mount, initialize Axios with stored token and fetch status if on a protected route
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Only fetch auth status if the current route is protected
    if (isProtectedRoute) {
      fetchAuthStatus();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      closeWebSocket();
    };
  }, [fetchAuthStatus, closeWebSocket, isProtectedRoute]);

  return (
    <AuthContext.Provider
      value={{
        authenticated: authState.authenticated,
        email: authState.email,
        role: authState.role,
        refreshAuthStatus: fetchAuthStatus,
        logout,
      }}
    >
      {authState.isLoading ? (
        <div>Loading...</div> // Or a spinner component
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
