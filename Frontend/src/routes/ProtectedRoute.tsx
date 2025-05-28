import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/Auth/authStore';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';

const ProtectedRoute = () => {
  const { ready, accessToken } = useAuthStore();

  if (!ready) return <LoadingScreen />;          // wait for AuthProvider

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;