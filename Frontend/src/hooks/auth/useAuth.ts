import { useCallback } from 'react';
import { api } from '@/api/axios';
import { callLogin, callLogout } from '@/api/Auth/auth';
import { useAuthStore } from '@/stores/Auth/authStore';
import { UserLoginDto } from '@/types/User/Auth/userLoginForm';
import { LoginRes } from '@/types/User/Auth/authTypes';
import { UserDto } from '@/types/User/UserDto';

export function useAuth() {
  const store = useAuthStore();

  /* —— login —— */
  const login = useCallback(async (dto: UserLoginDto): Promise<LoginRes> => {
    const res = await callLogin(dto);
    if (!res.success || !res.sessionId || !res.accessToken) return res;

    store.setAuth(res.accessToken, res.sessionId, res.persoid, res.wsMac);
    api.defaults.headers.common.Authorization = `Bearer ${res.accessToken}`;

    try {
      const { data: me } = await api.get<UserDto>('/api/users/me');
      store.mergeUser(me);
    } catch {/* ignore */ }

    return res;
  }, [store]);

  /* —— logout —— */
  const logout = useCallback(async () => {
    await callLogout();          // clears store inside helper
  }, []);

  return {
    accessToken : store.accessToken,
    user        : store.user,
    authenticated: !!store.accessToken,
    isLoading     : store.isLoading,
    login, logout,
  };
}
