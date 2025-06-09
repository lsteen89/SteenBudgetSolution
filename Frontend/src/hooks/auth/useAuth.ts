import { useCallback } from 'react';
import { useAuthStore } from '@/stores/Auth/authStore';
import { callLogin, callLogout } from '@/api/Auth/auth';
import { api } from '@/api/axios';
import type { UserLoginDto } from '@myTypes/User/Auth/userLoginForm';
import type { LoginRes } from '@/types/User/Auth/authTypes';
import type { UserDto } from '@myTypes/User/UserDto';

export function useAuth() {
  // Select actions and specific state pieces for stability and clarity
  const setAuthAction = useAuthStore(s => s.setAuth);
  const mergeUserAction = useAuthStore(s => s.mergeUser);
  const currentAccessToken = useAuthStore(s => s.accessToken);
  const currentUser = useAuthStore(s => s.user);
  const isAuthInitialized = useAuthStore(s => s.authProviderInitialized);
  const currentRememberMe = useAuthStore(s => s.rememberMe);

  const login = useCallback(async (dto: UserLoginDto, rememberMe: boolean): Promise<LoginRes> => {
    const res = await callLogin(dto, rememberMe); // Assuming callLogin now takes rememberMe

    if (!res.success || !res.sessionId || !res.accessToken || !res.persoid) {
      // If login is not successful, but we want to ensure store reflects an initialized state (e.g. to show login page)
      // This depends on whether callLogin failing should still mark auth as "initialized"
      // For now, assuming AuthProvider handles the base initialization.
      return res;
    }

    // Ensure wsMac is handled correctly (null if undefined)
    setAuthAction(res.accessToken, res.sessionId, res.persoid, res.wsMac ?? null, rememberMe);
    api.defaults.headers.common.Authorization = `Bearer ${res.accessToken}`;

    try {
      const { data: me } = await api.get<UserDto>('/api/users/me');
      mergeUserAction(me);
    } catch (err) {
      console.error("Failed to fetch user details after login:", err);
      // Potentially clear user data or handle error if this is critical
    }

    return res;
  }, [setAuthAction, mergeUserAction]); // Dependencies are stable store actions

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