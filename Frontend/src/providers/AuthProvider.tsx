import { api, queueRefresh } from "@/api/axios";
import { useProactiveRefresh } from "@/hooks/useProactiveRefresh";
import { useAuthStore } from "@/stores/Auth/authStore";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { PropsWithChildren, useEffect } from "react";

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const appInitialized = useAuthStore((state) => state.authProviderInitialized);
  const setAppInitialized = useAuthStore(
    (state) => state.setAuthProviderInitialized,
  );
  const clearAuthStore = useAuthStore((state) => state.clear);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      await useAuthStore.persist.rehydrate();
      if (!isMounted) return;

      const { accessToken, sessionId, rememberMe } = useAuthStore.getState();
      const browserSessionMarker = sessionStorage.getItem("appSessionActive");

      // if token exists, set axios header right away
      if (accessToken)
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      // enforce non-remember sessions
      if (!rememberMe && accessToken && !browserSessionMarker) {
        clearAuthStore();
        setAppInitialized(true);
        return;
      }

      // only refresh when rememberMe expects cookie-backed sessions
      if (accessToken && rememberMe) {
        try {
          await queueRefresh(true);
          if (!isMounted) return;
        } catch (err) {
          // no panic logout; just clear local session
          clearAuthStore();
          setAppInitialized(true);
          return;
        }
      }

      setAppInitialized(true);
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, [setAppInitialized, clearAuthStore]);

  useProactiveRefresh();

  return appInitialized ? <>{children}</> : <LoadingScreen />;
};
