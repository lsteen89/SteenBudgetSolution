import { useCallback } from 'react';
import { useAuthStore } from '@/stores/Auth/authStore';
import { callLogin, callLogout } from '@/api/Auth/auth';
import { api } from '@/api/axios';
import type { UserLoginDto } from '@myTypes/User/Auth/userLoginForm';
type LoginRes = Awaited<ReturnType<typeof callLogin>>;
import type { UserDto } from '@myTypes/User/UserDto';
import type { ApiEnvelope } from '@/api/api.types';

export function useAuth() {
  const setAuthAction = useAuthStore(s => s.setAuth);
  const mergeUserAction = useAuthStore(s => s.mergeUser);
  const currentAccessToken = useAuthStore(s => s.accessToken);
  const currentUser = useAuthStore(s => s.user);
  const isAuthInitialized = useAuthStore(s => s.authProviderInitialized);
  const currentRememberMe = useAuthStore(s => s.rememberMe);

  const login = useCallback(
    async (dto: UserLoginDto, rememberMe: boolean): Promise<LoginRes> => {
      const payload = {
        email: dto.email,
        password: dto.password,
        rememberMe,
        ...(dto.captchaToken ? { captchaToken: dto.captchaToken } : {}),
      } as const;

      const res = await callLogin(payload);

      if (!res.success) return res;

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

      // Fetch /me using ApiEnvelope<UserDto>
      try {
        const resp = await api.get<ApiEnvelope<UserDto>>('/api/users/me');
        const env = resp.data;

        if (!env.isSuccess || !env.data || env.error) {
          console.error('[auth] /me envelope failure:', env.error);
        } else {
          mergeUserAction(env.data);
        }
      } catch (err) {
        console.error('[auth] fetch /me failed:', err);
      }

      return res;
    },
    [setAuthAction, mergeUserAction]
  );

  const logout = useCallback(async () => {
    await callLogout();
  }, []);

  return {
    accessToken: currentAccessToken,
    user: currentUser,
    authenticated: !!currentAccessToken,
    isLoading: !isAuthInitialized,
    rememberMe: currentRememberMe,
    login,
    logout,
  };
}
