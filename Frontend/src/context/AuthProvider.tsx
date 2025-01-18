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
        const response = await axios.get<AuthState>("/api/auth/status", { withCredentials: true });
        setAuthState(response.data);
      } catch {
        setAuthState({ authenticated: false });
      }
    };

    fetchAuthStatus();

    // Optional: Set up periodic validation (every 5 minutes)
    const interval = setInterval(fetchAuthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};
