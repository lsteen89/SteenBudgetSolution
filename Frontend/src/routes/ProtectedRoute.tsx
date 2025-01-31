import React from "react";
import { Navigate, useLocation  } from "react-router-dom";
import { useAuth } from "@context/AuthProvider";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === 'development';
  const location = useLocation();

  if (isDebugMode) {
    console.log("Debug mode active: bypassing authentication");
    return <>{children}</>; // Bypass authentication in development
  }

  if (auth?.authenticated) {
    return <>{children}</>;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
