import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/AuthProvider";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === 'development';

  if (isDebugMode) {
    console.log("Debug mode active: bypassing authentication");
    return <>{children}</>; // Bypass authentication in development
  }

  if (auth?.authenticated) {
    return <>{children}</>;
  }

  return <Navigate to="/login" />;
};

export default ProtectedRoute;
