import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/Auth/authStore';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';

const ProtectedRoute = () => {
  const isAuthInitialized = useAuthStore(state => state.authProviderInitialized);
  const accessToken = useAuthStore(state => state.accessToken);
  const isDebugMode = process.env.NODE_ENV === 'development';
  
  if (!isAuthInitialized  && !isDebugMode) { // Only show loading if not in debug and not ready
    return <LoadingScreen />;
  }

  // If in debug mode, always render the requested component (Outlet)
  if (isDebugMode) {
    return <Outlet />;
  }

  // Original logic: if not in debug mode, check for accessToken
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;

};

export default ProtectedRoute;