import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthProvider';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';

interface ProtectedRouteProps {
  children: JSX.Element | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, isLoading } = useAuth();
  const isDebugMode = import.meta.env.MODE === 'development';

  // Optional: while loading, show a spinner
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If debug mode, bypass authentication checks
  if (isDebugMode) {
    return children;
  }

  // If user is not authenticated, redirect to login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, show the protected content
  return children;
};

export default ProtectedRoute;
