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
  const [authState, setAuthState] = useState<AuthState & { isLoading: boolean }>({ authenticated: false, isLoading: true });
  const wsRef = useRef<WebSocket | null>(null);
  const location = useLocation(); 

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
      const token = localStorage.getItem('accessToken');
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
        } 
        else if (event.data === "ping") {
          // Log ping messages from server
          console.log("AuthProvider: Received ping from server."); 
        }
        else if (event.data === "logout" || event.data === "session-expired") {
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

  // On mount, initialize Axios with stored token and fetch status if token exists
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchAuthStatus();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      closeWebSocket();
    };
  }, [fetchAuthStatus, closeWebSocket]);

/*
 * This effect runs on every route change (dependency on 'location') to monitor the access token's validity.
 * It retrieves the access token from localStorage and decodes it to extract the expiration claim.
 * If the token's expiration (exp) exists and is within 60 seconds of expiring, 
 * the effect initiates a refresh request by calling the /api/auth/refresh endpoint.
 * On a successful refresh, it updates localStorage and Axios defaults with the new tokens.
 * If token decoding fails or if the token is invalid, it logs an error and logs the user out.
 */
useEffect(() => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      // Decode the JWT token to obtain its payload, including the expiration time.
      const decoded = jwtDecode<JwtPayload>(token);
      
      // Check if the 'exp' claim exists and whether the token is about to expire (less than 60 seconds remaining)
      if (decoded.exp !== undefined && (decoded.exp * 1000 - Date.now()) < 60000) {
        console.log("Token about to expire. Initiating refresh...");
        axiosInstance.post("/api/auth/refresh", {
          refreshToken: localStorage.getItem("refreshToken")
        })
        .then((res) => {
          if (res.data.success) {
            // Update localStorage and Axios defaults with new tokens.
            localStorage.setItem("accessToken", res.data.accessToken);
            localStorage.setItem("refreshToken", res.data.refreshToken);
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${res.data.accessToken}`;
            console.log("Token refresh succeeded. New access token set.");
          }
        })
        .catch((err) => {
          console.error("Error refreshing token:", err);
          logout();
        });
      }
    } catch (error) {
      console.error("Error decoding token:", error);
      logout();
    }
  }
}, [location, logout]);


  return (
    <AuthContext.Provider
      value={{
        authenticated: authState.authenticated,
        email: authState.email,
        role: authState.role,
        refreshAuthStatus: fetchAuthStatus,
        logout,
        isLoading: authState.isLoading, // Expose isLoading
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