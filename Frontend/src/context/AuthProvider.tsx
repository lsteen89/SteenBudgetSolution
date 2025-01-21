import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "@api/axiosConfig"; // Your custom Axios instance
import { isAxiosError } from "axios"; // Import the utility function directly from Axios

// Define the shape of the authentication state
interface AuthState {
  authenticated: boolean;
  email?: string;
  role?: string | null;
}

// Define the context type, extending AuthState with additional functions
export interface AuthContextType extends AuthState {
  refreshAuthStatus: () => Promise<void>;
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

// AuthProvider component to wrap the application and provide authentication state
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ authenticated: false });

  // Function to fetch authentication status from the backend
  const fetchAuthStatus = useCallback(async () => {
    try {
      console.log('AuthProvider: Sending request to /api/auth/status...');
      const response = await axiosInstance.get<AuthState>("/api/auth/status", { withCredentials: true });

      console.log('AuthProvider: Received auth status response:', {
        status: response.status,
        data: response.data,
      });

      // Update the authentication state based on the response
      setAuthState(response.data);
    } catch (error) {
      if (isAxiosError(error)) {
        console.error('AuthProvider: Axios error:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('AuthProvider: Unexpected error:', error);
      }

      // Reset authentication state on error
      setAuthState({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    // Fetch authentication status when the component mounts
    fetchAuthStatus();

    // Optionally, set up a polling mechanism to refresh auth status periodically
    const interval = setInterval(fetchAuthStatus, 5 * 60 * 1000); // Every 5 minutes

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, [fetchAuthStatus]);

  return (
    <AuthContext.Provider value={{ ...authState, refreshAuthStatus: fetchAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
