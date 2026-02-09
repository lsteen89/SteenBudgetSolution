import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/stores/Auth/authStore";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";

const AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === "true";

export default function ProtectedRoute() {
  const location = useLocation();

  const { initialized, token } = useAuthStore(
    useShallow((s) => ({
      initialized: s.authProviderInitialized,
      token: s.accessToken,
    }))
  );

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
