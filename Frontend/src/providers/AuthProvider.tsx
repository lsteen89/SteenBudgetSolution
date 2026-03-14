import { hydrateCurrentAuthenticatedState } from "@/api/Auth/hydrateAuth";
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

      const { accessToken, rememberMe } = useAuthStore.getState();
      const browserSessionMarker = sessionStorage.getItem("appSessionActive");

      if (accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      }

      // Non-remembered session must die when browser session marker is gone
      if (!rememberMe && accessToken && !browserSessionMarker) {
        clearAuthStore();
        setAppInitialized(true);
        return;
      }

      try {
        if (accessToken && rememberMe) {
          // Cookie-backed session: refresh token + hydrate user/preferences
          await queueRefresh(true);
        } else if (accessToken) {
          // Token already present and still in active browser session:
          // hydrate user/preferences without forcing refresh
          await hydrateCurrentAuthenticatedState();
        }
      } catch {
        clearAuthStore();
        setAppInitialized(true);
        return;
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
// The AuthProvider component is responsible for initializing the authentication state of the application.
