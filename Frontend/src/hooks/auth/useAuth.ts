import { useCallback } from 'react';
import { useAuthStore } from '@/stores/Auth/authStore';
import { callLogin, callLogout } from '@/api/Auth/auth';
import { api } from '@/api/axios';
import type { UserLoginDto } from '@myTypes/User/Auth/userLoginForm';
type LoginRes = Awaited<ReturnType<typeof callLogin>>;
import type { UserDto } from '@myTypes/User/UserDto';

export function useAuth() {
  // Select actions and specific state pieces for stability and clarity
  const setAuthAction = useAuthStore(s => s.setAuth);
  const mergeUserAction = useAuthStore(s => s.mergeUser);
  const currentAccessToken = useAuthStore(s => s.accessToken);
  const currentUser = useAuthStore(s => s.user);
  const isAuthInitialized = useAuthStore(s => s.authProviderInitialized);
  const currentRememberMe = useAuthStore(s => s.rememberMe);

  const login = useCallback(
    async (dto: UserLoginDto, rememberMe: boolean): Promise<LoginRes> => {
      // Build a clean payload: coerce null → undefined and only include captchaToken if present
      const payload = {
        email: dto.email,
        password: dto.password,
        rememberMe,
        ...(dto.captchaToken ? { captchaToken: dto.captchaToken } : {}),
      } as const;

      const res = await callLogin(payload);

      if (!res.success) return res; // res is union; only proceed on success

      const {
        accessToken,
        sessionId,
        persoId,
        wsMac,
        rememberMe: rememberFromBE,
      } = res.data;

      setAuthAction(
        accessToken,
        sessionId,
        persoId,
        wsMac ?? null,
        rememberFromBE ?? rememberMe
      );
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      try {
        const { data: me } = await api.get<UserDto>('/api/users/me');
        mergeUserAction(me);
      } catch (err) {
        console.error('[auth] fetch /me failed:', err);
      }

      return res;
    },
    [setAuthAction, mergeUserAction]
  );

  const logout = useCallback(async () => {
    await callLogout(); // callLogout should handle clearing store (which sets authProviderInitialized=true)
  }, []); // callLogout is stable, no need to list store actions if it uses getState()

  return {
    accessToken: currentAccessToken,
    user: currentUser,
    authenticated: !!currentAccessToken,
    isLoading: !isAuthInitialized, //isLoading is true if AuthProvider is NOT yet initialized
    rememberMe: currentRememberMe,
    login,
    logout,
  };
}