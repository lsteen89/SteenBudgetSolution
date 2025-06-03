import { PropsWithChildren, useEffect } from 'react';
import { callLogout } from '@/api/Auth/auth';
import { useAuthStore } from '@/stores/Auth/authStore';
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { useProactiveRefresh } from '@/hooks/useProactiveRefresh';
import { queueRefresh } from '@/api/axios';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const appInitialized = useAuthStore(state => state.authProviderInitialized);
  const setAppInitialized = useAuthStore(state => state.setAuthProviderInitialized);
  const clearAuthStore = useAuthStore(state => state.clear);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Ensure we start fresh if this effect re-runs, though with stable deps it shouldn't.
      // However, onRehydrateStorage in store already sets authProviderInitialized to false.
      // setAppInitialized(false); // Not strictly needed here due to onRehydrateStorage

      await useAuthStore.persist.rehydrate();
      if (!isMounted) return;

      const { accessToken, sessionId, rememberMe: rehydratedRememberMe } = useAuthStore.getState();
      const browserSessionMarker = sessionStorage.getItem('appSessionActive');

      if (!rehydratedRememberMe && accessToken && !browserSessionMarker) {
        console.log('[AuthProvider] "Remember Me" false, AT found, but no session marker. Clearing local session.');
        if (isMounted) {
          clearAuthStore(); // clearAuthStore now sets authProviderInitialized to true
          // setAppInitialized(true); // Not needed, clearAuthStore handles it
        }
        return;
      }

      if (accessToken && sessionId) {
        try {
          console.log('[AuthProvider] Initial token/session exists, attempting refresh via queueRefresh...');
          await queueRefresh(true);
          if (!isMounted) return;
          console.log('[AuthProvider] Initial refresh attempt processed.');

          if (!useAuthStore.getState().rememberMe && useAuthStore.getState().accessToken) {
            sessionStorage.setItem('appSessionActive', 'true');
          }
        } catch (err) {
          if (!isMounted) return;
          console.error('[AuthProvider] Initial refresh via queueRefresh failed. Logging out.', err);
          await callLogout(); // callLogout will trigger clearAuthStore, which sets authProviderInitialized to true
          return;
        }
      }

      if (isMounted) {
        setAppInitialized(true); // All checks done, app is initialized
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [setAppInitialized, clearAuthStore]); // Stable dependencies

  useProactiveRefresh();

  return appInitialized ? <>{children}</> : <LoadingScreen />;
};