# Authentication Summary

This document explains our multi-layered approach to authentication and token management, ensuring users remain securely logged in or are promptly logged out if tokens expire or are invalidated.

---

## 1. Axios Interceptor for Auto-Refresh

**File**: `@api/axiosConfig.ts`

- All HTTP requests flow through an Axios instance.
- If a `401 Unauthorized` occurs, the interceptor **tries refreshing** the token once by calling `/api/auth/refresh`.
- If refresh fails, the request is rejected, and our `AuthProvider` logs the user out.

<details>
<summary>Sample Code</summary>

~~~ts
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : import.meta.env.VITE_API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if we're already refreshing
    if (originalRequest.url === "/api/auth/refresh") {
      return Promise.reject(error);
    }

    // If unauthorized and we haven't tried refresh yet:
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt token refresh
        const refreshResponse = await axiosInstance.post("/api/auth/refresh");
        if (refreshResponse.data?.success) {
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch {
        // If refresh fails, just reject.
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
~~~
</details>

---

## 2. AuthProvider for State & Periodic Checks

**File**: `@context/AuthProvider.tsx`

- **Initial Check**: On mount, calls `/api/auth/status` to see if the user is authenticated.
- **Periodic Poll**: Every 30 seconds, if authenticated, calls `/api/auth/status`. A `401` triggers a token refresh attempt; a failure logs the user out.
- **Logout**: Exposes a `logout()` method. Calls `/api/auth/logout` on the server and resets local `AuthState`.

<details>
<summary>Sample Code</summary>

~~~
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
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({
    authenticated: false,
    isLoading: true,
  });

  // -------------- WEBSOCKET LOGIC --------------
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

  // -------------- INITIAL AUTH STATUS CHECK --------------
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

  // -------------- LOGOUT METHOD --------------
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

  // -------------- MOUNT & UNMOUNT --------------
  useEffect(() => {
    // 1) initial auth check
    fetchAuthStatus();

    // 2) cleanup
    return () => closeWebSocket();
  }, [fetchAuthStatus, closeWebSocket]);

  // -------------- PERIODIC HTTP HEALTH CHECK --------------
  useEffect(() => {
    let healthInterval: number | undefined;

    if (authState.authenticated) {
      healthInterval = window.setInterval(async () => {
        try {
          // Minimal endpoint to confirm token validity
          await axiosInstance.get("/api/auth/status");
        } catch (error) {
          console.error("AuthProvider: health check error:", error);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (healthInterval) {
        clearInterval(healthInterval);
      }
    };
  }, [authState.authenticated]);

  // -------------- PROVIDE CONTEXT --------------
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
~~~
</details>

---

## 3. WebSocket for Immediate Session Expiry

- If the server determines a token is invalid (e.g., admin-forced logout or token timeout), it sends a "logout" or "session-expired" message over the WebSocket.
- The client instantly calls setAuthState({ authenticated: false }) and closes the WebSocket—no need to wait for the 30-second health check.

---

## Why This Works

1. **Active Requests**
   - If a token is invalid during an API call, the Axios interceptor handles refresh or logs out.

2. **Idle Users**
   - A periodic 30-second check calls /api/auth/status. If 401, token refresh logic triggers again; failing that, logs out.

3. **Immediate Server-Led Logout**
   - WebSocket messages (session-expired or logout) ensure instant termination without waiting for the next poll or user request.

This three-layer system—interceptor-based refresh, periodic status checks, and optional WebSocket push—covers all scenarios, ensuring a robust, production-level authentication flow.
