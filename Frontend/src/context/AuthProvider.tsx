import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import { useWebSocket } from "@hooks/useWebSocket";
import type { AuthState, AuthContextType } from "../types/authTypes";
import type { UserDto } from "../types/UserDto";

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
// Delay timer
const [wsEnabled, setWsEnabled] = useState(false);
  useEffect(() => {
    if (authState.authenticated) {
      // Delay enabling WebSocket connection to allow auth state to stabilize
      const timer = setTimeout(() => {
        setWsEnabled(true);
      }, 500); // 500ms delay
      return () => clearTimeout(timer);
    } else {
      setWsEnabled(false);
    }
  }, [authState.authenticated]);

  console.log("AuthProvider component rendering...");
  // Fetch auth status from the API
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
    // In development, force firstTimeLogin to true regardless of API response.
    const authData = import.meta.env.MODE === "development"
      ? { ...response.data, firstTimeLogin: true }
      : response.data;
    setAuthState({
      ...authData,
      isLoading: false,
    });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log("AuthProvider: user not authenticated");
      } else {
        console.error("AuthProvider: unexpected error:", error);
      }
      setAuthState({ authenticated: false, isLoading: false, firstTimeLogin: false });
    }
  }, []);

  // For development, force auth and wizard state:
  useEffect(() => {
    if (import.meta.env.MODE === "development") {
      // Dev: immediately logged in for convenience
      setAuthState({
        authenticated: true,
        isLoading: false,
        firstTimeLogin: true,
        user: undefined,
      });
    } else {
      // Production: show loading until we fetch
      setAuthState({
        authenticated: false,
        isLoading: true,
        firstTimeLogin: false,
        user: undefined,
      });
      // Then do the actual check
      fetchAuthStatus();
    }
  }, [fetchAuthStatus]);

  // Determine WebSocket URL based on environment.
  const websocketUrl =
    import.meta.env.MODE === "development"
      ? "ws://localhost:5000/ws/auth"
      : "wss://ebudget.se/ws/auth";

  // Initialize the WebSocket hook only when authenticated.
  useWebSocket(websocketUrl, {
    enabled: wsEnabled,
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


  // Logout function
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("Logout successful.");
    } catch (error) {
      console.error("Logout error:", error);
    }
    // Ensure client state reflects logout:
    setAuthState({ authenticated: false, isLoading: false, firstTimeLogin: false });

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

  const fetchUserData = useCallback(async () => {
    try {
        const response = await axiosInstance.get<UserDto>("/api/users/me");
        console.log("fetchUserData response:", response.data); // Log response data
        setAuthState((prev) => {
            console.log("fetchUserData prev.user:", prev.user); // Log prev.user
            return {
                ...prev,
                user: response.data,
            };
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        setAuthState((prev) => ({ ...prev, user: undefined }));
    }
}, []);


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
        fetchUserData: fetchUserData,
        user: authState.user,
      }}
    >
      {authState.isLoading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;