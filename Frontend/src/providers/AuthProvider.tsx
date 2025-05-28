import { PropsWithChildren, useEffect, useState } from 'react';
import { callLogout, refreshToken } from '@/api/Auth/auth';
import { useAuthStore } from '@/stores/Auth/authStore';
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import { useProactiveRefresh } from '@/hooks/useProactiveRefresh'; // Hook to refresh the token proactively
import { usePeriodicRefresh } from '@/hooks/usePeriodicRefresh'; // Hook to refresh the token periodically
import { queueRefresh } from '@/api/axios';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const { setReady } = useAuthStore();
  const ready        = useAuthStore(s => s.ready);

    useEffect(() => {
    let isMounted = true; // Good practice for async operations in useEffect
    (async () => {
        await useAuthStore.persist.rehydrate();
        if (!isMounted) return;

        const { accessToken, sessionId } = useAuthStore.getState();
        if (accessToken && sessionId) {
        try {
            console.log('[AuthProvider] Initial token/session exists, attempting refresh via queueRefresh...');
            // Use queueRefresh to handle the refresh logic
            await queueRefresh(true); // Changed from direct refreshToken()
            if (!isMounted) return;
            console.log('[AuthProvider] Initial refresh attempt processed by queueRefresh.');
        } catch (err) {
            if (!isMounted) return;
            console.error('[AuthProvider] Initial refresh via queueRefresh failed. Logging out.', err);
            // If the refresh fails, we should log out the user
            await callLogout(); 
            // setReady(true) will still be called in the finally/after if not returned here
            // but if logout happens, ready state might be handled by redirection or store clear.
            // For clarity, if logout occurs, we might not want to proceed to setReady(true) immediately.
            // However, callLogout redirects, so setReady might be moot.
            return; // Explicitly return if logout is called
        }
        }
        if (isMounted) {
        setReady(true); // Either refreshed, nothing to refresh, or handled error by logging out
        }
    })();

    return () => {
        isMounted = false;
    };
    }, []); // Empty dependency array, runs once on mount

  useProactiveRefresh();
  return ready ? <>{children}</> : <LoadingScreen />;
};

