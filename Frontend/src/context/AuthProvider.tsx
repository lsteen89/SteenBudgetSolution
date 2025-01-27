import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";

interface AuthState {
  authenticated: boolean;
  email?: string;
  role?: string | null;
}

export interface AuthContextType extends AuthState {
  refreshAuthStatus: () => Promise<void>;
  logout: () => Promise<void>; // Optional
}

// Create the AuthContext with a default value of null
export const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Fetch auth status (HTTP cookie-based)
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status", {
        withCredentials: true,
      });
      console.log("AuthProvider: Status response:", response.data);
      setAuthState(response.data);

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
      setAuthState({ authenticated: false });
      closeWebSocket();
    }
  }, []);

  // 2. Additional method to handle manual logout
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }
    setAuthState({ authenticated: false });
    closeWebSocket();
  }, []);

  // 3. WebSocket opener
  const openWebSocket = useCallback(() => {
    console.log("AuthProvider: Opening WebSocket...");
    const socket = new WebSocket("wss://localhost:5000/ws/auth");

    socket.onopen = () => {
      console.log("AuthProvider: WebSocket connected.");
      wsRef.current = socket;
    };

    socket.onmessage = (event) => {
      console.log("AuthProvider: Received WS message:", event.data);
      if (event.data === "ready") {
        // This is the initial "ready" from server
        console.log("AuthProvider: WebSocket is ready!");
      } else if (event.data === "logout" || event.data === "session-expired") {
        console.log("AuthProvider: Received logout/session-expired from server, updating state...");
        setAuthState({ authenticated: false });
        closeWebSocket();
      } else {
        // Possibly handle other messages or echo responses
        console.log("AuthProvider: WS message:", event.data);
      }
    };

    socket.onclose = () => {
      console.log("AuthProvider: WebSocket closed.");
      wsRef.current = null;
      // If the user was authenticated, consider re-checking status or leaving them in a partial state
    };

    socket.onerror = (err) => {
      console.error("AuthProvider: WebSocket error:", err);
    };
  }, []);

  // 4. WebSocket closer
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // 5. On mount, fetch status once
  useEffect(() => {
    fetchAuthStatus();
    return () => {
      closeWebSocket();
    };
  }, [fetchAuthStatus, closeWebSocket]);

  // 6. Polling to refresh auth status every 5 minutes. This is optional. Its obselote now, but ill keep it here for reference
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.authenticated) {
        fetchAuthStatus();
      }
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [authState.authenticated, fetchAuthStatus]);
  */
  return (
    <AuthContext.Provider
      value={{
        ...authState,
        refreshAuthStatus: fetchAuthStatus,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};