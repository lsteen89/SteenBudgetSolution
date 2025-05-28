import { queueRefresh }  from '@/api/axios';
import { useAuthStore }  from '@/stores/Auth/authStore';
import { jwtDecode }     from 'jwt-decode';
import { useEffect }     from 'react';

export const useProactiveRefresh = () => {
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const { exp } = jwtDecode<{ exp: number }>(accessToken);
    const skewMs  = 60_000;                                // 1 min early
    const delay   = exp * 1000 - Date.now() - skewMs;

    if (delay <= 0) { queueRefresh(); return; }            // already stale

    const id = setTimeout(queueRefresh, delay);
    return () => clearTimeout(id);                         // re-arm
  }, [accessToken]);
};

// This hook sets up a timer to proactively refresh the JWT token
// before it expires. It calculates the delay based on the token's expiration time
// and sets a timeout to call the `queueRefresh` function.