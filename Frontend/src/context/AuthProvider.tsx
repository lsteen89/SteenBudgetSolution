import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import { useWebSocket } from "@hooks/useWebSocket";
import type { AuthState, AuthContextType } from "../types/authTypes";

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({
    authenticated: false,
    isLoading: true,
  });

  console.log("AuthProvider component rendering...");

  // Determine WebSocket URL based on environment.
  const websocketUrl =
    import.meta.env.MODE === "development"
      ? "ws://localhost:5000/ws/auth"
      : "wss://ebudget.se/ws/auth";

  // Initialize the WebSocket hook only when authenticated.
  useWebSocket(websocketUrl, {
    enabled: authState.authenticated,
    maxAttempts: 3,
    reconnectInterval: 5000,
    onOpen: () => console.log("AuthProvider: WebSocket connected."),
    onMessage: (event) => {
      console.log("AuthProvider: WS message:", event.data);
      if (event.data === "logout" || event.data === "session-expired") {
        setAuthState({ authenticated: false, isLoading: false });
      }
    },
    onError: (error) => console.error("AuthProvider: WebSocket error:", error),
    onClose: () => console.log("AuthProvider: WebSocket closed."),
  });

  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
      console.log("AuthProvider: Status response:", response.data);
      setAuthState({ ...response.data, isLoading: false });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log("AuthProvider: user not authenticated");
      } else {
        console.error("AuthProvider: unexpected error:", error);
      }
      setAuthState({ authenticated: false, isLoading: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("Logout successful.");
    } catch (error) {
      console.error("Logout error:", error);
    }
    // Ensure client state reflects logout:
    setAuthState({ authenticated: false, isLoading: false });

  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

  // Periodic health check
  useEffect(() => {
    let healthInterval: number | undefined;
    if (authState.authenticated) {
      healthInterval = window.setInterval(async () => {
        try {
          const res = await axiosInstance.get("/api/auth/status");
          console.log("Status check successful:", res.data);
        } catch (error) {
          console.error("Health check error:", error);
        }
      }, 30000);
    }
    return () => {
      if (healthInterval) clearInterval(healthInterval);
    };
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

export default AuthProvider;