import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axiosInstance from "@api/axiosConfig";
import { isAxiosError } from "axios";
import type { AuthState, AuthContextType } from "../types/authTypes";

console.log("AuthProvider component rendering...");
useEffect(() => {
  console.log("AuthProvider mounted.");
  return () => console.log("AuthProvider unmounted.");
}, []);

type Props = {
  children: React.ReactNode;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({
    authenticated: false,
    isLoading: true,
  });

  /** -------------- WEBSOCKET LOGIC -------------- **/
  const wsRef = useRef<WebSocket | null>(null);

  // Close WebSocket
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Open WebSocket if authenticated
  const openWebSocket = useCallback(() => {
    console.log("openWebSocket CALLED");
    const websocketUrl =
      import.meta.env.MODE === "development"
        ? "ws://localhost:5000/ws/auth"
        : "wss://ebudget.se/ws/auth";

    const connect = (attempt = 1) => {
      console.log(`AuthProvider: WS connect attempt ${attempt}...`);
      const socket = new WebSocket(websocketUrl);

      socket.onopen = () => {
        console.log("AuthProvider: WebSocket connected.");
        wsRef.current = socket;
      };

      socket.onmessage = (event) => {
        console.log("AuthProvider: WS message:", event.data);
        if (event.data === "logout" || event.data === "session-expired") {
          // Force local logout
          setAuthState({ authenticated: false, isLoading: false });
          closeWebSocket();
        }
      };

      socket.onclose = () => {
        console.log("AuthProvider: WebSocket closed.");
        wsRef.current = null;
        // Retry if still authenticated, up to 3 times
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

  /** -------------- INITIAL AUTH STATUS CHECK -------------- **/
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
      // If 401 => user not authenticated
      if (isAxiosError(error) && error.response?.status === 401) {
        console.log("AuthProvider: user not authenticated");
      } else {
        console.error("AuthProvider: unexpected error:", error);
      }
      setAuthState({ authenticated: false, isLoading: false });
      closeWebSocket();
    }
  }, [closeWebSocket, openWebSocket]);

  /** -------------- LOGOUT METHOD -------------- **/
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("AuthProvider: Logout successful.");
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }
    setAuthState({ authenticated: false, isLoading: false });
    closeWebSocket();
  }, [closeWebSocket]);

  /** -------------- MOUNT & UNMOUNT -------------- **/
  useEffect(() => {
    // 1) initial auth check
    fetchAuthStatus();

    // 2) cleanup
    return () => closeWebSocket();
  }, [fetchAuthStatus, closeWebSocket]);

  /** -------------- PERIODIC HTTP HEALTH CHECK -------------- **/
  useEffect(() => {
    // If user is authenticated, set up a 30s interval to check token validity
    let healthInterval: number | undefined;

    if (authState.authenticated) {
      healthInterval = window.setInterval(async () => {
        try {
          // Minimal endpoint to confirm token validity
          await axiosInstance.get("/api/auth/status");
          // If 401 => interceptor tries refresh. If refresh fails => user logs out
        } catch (error) {
          console.error("AuthProvider: health check error:", error);
        }
      }, 30_000); // 30 seconds
    }

    return () => {
      if (healthInterval) {
        clearInterval(healthInterval);
      }
    };
  }, [authState.authenticated]);

  /** -------------- PROVIDE CONTEXT -------------- **/
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
