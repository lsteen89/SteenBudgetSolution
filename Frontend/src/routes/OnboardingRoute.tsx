import { useAuthStore } from "@/stores/Auth/authStore";
import { readJwtEmailConfirmed } from "@/utils/auth/jwt";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { Navigate, Outlet } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

const AUTH_BYPASS =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_AUTH_BYPASS).toLowerCase() === "true";

export default function OnboardingRoute() {
  const { initialized, token } = useAuthStore(
    useShallow((s) => ({
      initialized: s.authProviderInitialized,
      token: s.accessToken,
    })),
  );

  if (!initialized && !AUTH_BYPASS) return <LoadingScreen />;
  if (AUTH_BYPASS) return <Outlet />;

  if (!token) {
    return <Navigate to="/email-verification-recovery" replace />;
  }

  if (readJwtEmailConfirmed(token)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
