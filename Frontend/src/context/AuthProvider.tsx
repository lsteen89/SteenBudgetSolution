import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import { useWebSocket } from "@hooks/useWebSocket";
import type { AuthState, AuthContextType } from "../types/authTypes";
import { UserDto } from "../types/UserDto";

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
    firstTimeLogin: false, 
    user: undefined,
  });
  const devOverrideRan = useRef(false);
  
  const setLoggedInUser = (user: UserDto) => {
    setAuthState((prev) => ({
      ...prev,
      authenticated: true,
      isLoading: false,
      // if needed, you can also compute firstTimeLogin from user
      user: user,
    }));
  };

  console.log("AuthProvider component rendering...");

  // For development, force auth and wizard state:
  useEffect(() => {
    if (
      import.meta.env.MODE === "development" &&
      authState.user === undefined
    ) {
      setAuthState((prev) => ({
        ...prev,
        authenticated: true,
        isLoading: false,
        firstTimeLogin: true,
        user: prev.user, // preserve if it was set
      }));
    } else if (!authState.user) {
      // Production: start from a clean state if no user
      setAuthState((prev) => ({
        ...prev,
        authenticated: false,
        isLoading: false,
        firstTimeLogin: false,
        user: undefined,
      }));
    }
  }, [authState.user]);

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
        setAuthState({ authenticated: false, isLoading: false, firstTimeLogin: false });
      }
    },
    onError: (error) => console.error("AuthProvider: WebSocket error:", error),
    onClose: () => console.log("AuthProvider: WebSocket closed."),
  });

  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
    // In development, force firstTimeLogin to true regardless of API response.
    const authData = import.meta.env.MODE === "development"
      ? { ...response.data, firstTimeLogin: true }
      : response.data;
      setAuthState((prev) => ({
        ...prev,
        authenticated: response.data.authenticated,
        firstTimeLogin: response.data.firstTimeLogin,
        user: response.data.user !== undefined ? response.data.user : prev.user, // Keep the user if not returned
        isLoading: false,
      }));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log("AuthProvider: user not authenticated");
      } else {
        console.error("AuthProvider: unexpected error:", error);
      }
      setAuthState({ authenticated: false, isLoading: false, firstTimeLogin: false });
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
    setAuthState({ authenticated: false, isLoading: false, firstTimeLogin: false, user: undefined });

  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== "development") {
      fetchAuthStatus();
    }
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
      }, 60000);
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
        firstTimeLogin: authState.firstTimeLogin,
        refreshAuthStatus: fetchAuthStatus,
        logout,
        isLoading: authState.isLoading,
        setLoggedInUser,
      }}
    >
      {authState.isLoading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;