import { useAuthStore } from "@/stores/Auth/authStore";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

const AUTH_BYPASS =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_AUTH_BYPASS).toLowerCase() === "true";

export default function ProtectedRoute() {
  const location = useLocation();

  const { initialized, token } = useAuthStore(
    useShallow((s) => ({
      initialized: s.authProviderInitialized,
      token: s.accessToken,
    })),
  );
  console.log("AUTH_BYPASS", AUTH_BYPASS);
  console.log("token exists", !!token);
  console.log("initialized", initialized);

  if (!initialized && !AUTH_BYPASS) return <LoadingScreen />;
  if (AUTH_BYPASS) return <Outlet />;

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
