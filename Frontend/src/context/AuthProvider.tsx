// AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "@api/axiosConfig"; // Your custom Axios instance
import { isAxiosError } from "axios"; // Import the utility function directly from Axios

interface AuthState {
  authenticated: boolean;
  email?: string;
  role?: string | null;
}

export interface AuthContextType extends AuthState {
  refreshAuthStatus: () => Promise<void>;
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
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });

  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log('AuthProvider: Sending request to /api/auth/status...');
      const response = await axiosInstance.get<AuthState>("/api/auth/status", { withCredentials: true });

      console.log('AuthProvider: Received auth status response:', {
        status: response.status,
        data: response.data,
      });

      // Add logs to inspect the response data
      console.log('Setting authState with:', response.data);

      setAuthState(response.data); // Update state with the received data
    } catch (error) {
      if (isAxiosError(error)) {
        console.error('AuthProvider: Axios error:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('AuthProvider: Unexpected error:', error);
      }

      // Set unauthenticated state on error
      console.log('Setting authState to unauthenticated due to error.');
      setAuthState({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    // Fetch auth status on component mount
    fetchAuthStatus();

    // Optional: Periodically revalidate auth status (e.g., every 5 minutes)
    const interval = setInterval(fetchAuthStatus, 5 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [fetchAuthStatus]);

  return <AuthContext.Provider value={{ ...authState, refreshAuthStatus: fetchAuthStatus }}>{children}</AuthContext.Provider>;
};
