import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface AuthState {
  authenticated: boolean;
  email?: string;
  role?: string;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);

  useEffect(() => {
    const fetchAuthStatus = async () => {
      try {
        console.log('AuthProvider: Sending request to /api/auth/status...');
        const response = await axios.get<AuthState>("/api/auth/status", { withCredentials: true });

        console.log('AuthProvider: Received auth status response:', {
          status: response.status,
          data: response.data,
        });

        setAuthState(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Axios-specific error logging
          console.error('AuthProvider: Error fetching auth status:', {
            status: error.response?.status,
            data: error.response?.data,
          });
        } else {
          // Non-Axios errors
          console.error('AuthProvider: Unexpected error:', error);
        }

        // Set unauthenticated state on error
        setAuthState({ authenticated: false });
      }
    };

    // Fetch auth status on component mount
    fetchAuthStatus();

    // Optional: Periodically revalidate auth status (e.g., every 5 minutes)
    const interval = setInterval(fetchAuthStatus, 5 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};
