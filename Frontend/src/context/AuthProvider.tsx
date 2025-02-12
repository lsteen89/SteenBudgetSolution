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
  // Combined auth + loading state
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({
    authenticated: false,
    isLoading: true,
  });

  console.log("AuthProvider component rendering...");

  useEffect(() => {
    console.log("AuthProvider mounted.");
    return () => console.log("AuthProvider unmounted.");
  }, []);

  /** ----------------------------------------------------------------
   * WEBSOCKET LOGIC
   * ----------------------------------------------------------------*/
  const wsRef = useRef<WebSocket | null>(null);

  // This ref tracks whether we are *intentionally* closing the socket
  // (e.g., user logs out or we manually decide to close). If true,
  // we skip any auto-reconnect logic.
  const isManuallyClosingRef = useRef(false);

  // Close the WebSocket (with a manual flag set)
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log("AuthProvider: Closing WebSocket...");
      isManuallyClosingRef.current = true; // Mark intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Open the WebSocket if authenticated
  const openWebSocket = useCallback(() => {
    // If there's already a socket, skip
    if (wsRef.current) {
      console.log("AuthProvider: WebSocket already open, skipping...");
      return;
    }

    console.log("AuthProvider: openWebSocket CALLED");

    // Decide which URL to use
    const websocketUrl =
      import.meta.env.MODE === "development"
        ? "ws://localhost:5000/ws/auth"
        : "wss://ebudget.se/ws/auth";

    // We'll recursively call connect() on close for auto-retry
    const connect = (attempt = 1) => {
      console.log(`AuthProvider: WS connect attempt ${attempt}...`);

      // Since we're initiating a brand-new connection, it's no longer a manual close
      isManuallyClosingRef.current = false;

      const socket = new WebSocket(websocketUrl);

      socket.onopen = () => {
        console.log("AuthProvider: WebSocket connected.");
        wsRef.current = socket;
      };

      socket.onmessage = (event) => {
        console.log("AuthProvider: WS message:", event.data);

        // If server instructs us to logout or says session expired,
        // forcibly logout on the client side
        if (event.data === "logout" || event.data === "session-expired") {
          setAuthState({ authenticated: false, isLoading: false });
          closeWebSocket();
        }
      };

      socket.onclose = () => {
        console.log("AuthProvider: WebSocket closed.");
        wsRef.current = null;

        // If it wasn't an intentional close, and the user is still authenticated,
        // we can retry up to 3 times
        if (!isManuallyClosingRef.current && authState.authenticated && attempt < 3) {
          setTimeout(() => connect(attempt + 1), 5000);
        }
      };

      socket.onerror = (err) => {
        console.error("AuthProvider: WebSocket error:", err);
      };
    };

    // Start the initial connection attempt
    connect();
  }, [authState.authenticated, closeWebSocket]);

  /** ----------------------------------------------------------------
   * INITIAL AUTH STATUS CHECK
   * ----------------------------------------------------------------*/
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log("AuthProvider: Checking /api/auth/status");
      const response = await axiosInstance.get<AuthState>("/api/auth/status");
      console.log("AuthProvider: Status response:", response.data);

      setAuthState({ ...response.data, isLoading: false });

      // If authenticated, open WebSocket (if not already open)
      if (response.data.authenticated && !wsRef.current) {
        openWebSocket();
      } else if (!response.data.authenticated) {
        // Not authenticated => close any open socket
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

  /** ----------------------------------------------------------------
   * LOGOUT METHOD
   * ----------------------------------------------------------------*/
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      console.log("AuthProvider: Logout successful.");
    } catch (error) {
      console.error("AuthProvider: Logout error:", error);
    }

    // Mark user as logged out
    setAuthState({ authenticated: false, isLoading: false });
    // Close the WebSocket intentionally
    closeWebSocket();
  }, [closeWebSocket]);

  /** ----------------------------------------------------------------
   * ON MOUNT -> FETCH AUTH STATUS, ON UNMOUNT -> CLOSE WS
   * ----------------------------------------------------------------*/
  useEffect(() => {
    // Check auth on startup
    fetchAuthStatus();

    // Cleanup: close socket on unmount
    return () => closeWebSocket();
  }, [fetchAuthStatus, closeWebSocket]);

  /** ----------------------------------------------------------------
   * PERIODIC HTTP HEALTH CHECK
   * ----------------------------------------------------------------*/
  useEffect(() => {
    let healthInterval: number | undefined;

    if (authState.authenticated) {
      // Check every 30s if token still valid
      healthInterval = window.setInterval(async () => {
        try {
          await axiosInstance.get("/api/auth/status");
          // If 401 => interceptor tries refresh; if refresh fails => auto logout
        } catch (error) {
          console.error("AuthProvider: health check error:", error);
        }
      }, 30_000);
    }

    return () => {
      if (healthInterval) {
        clearInterval(healthInterval);
      }
    };
  }, [authState.authenticated]);

  /** ----------------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------------*/
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
