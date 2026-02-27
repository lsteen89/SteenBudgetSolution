import type { ApiEnvelope } from "@/api/api.types";
import type { AuthResult } from "@/api/auth.types.ts";
import { callLogin, callLogout } from "@/api/Auth/auth";
import { api } from "@/api/axios";
import { useAuthStore } from "@/stores/Auth/authStore";
import type { UserLoginDto } from "@myTypes/User/Auth/userLoginForm";
import type { UserDto } from "@myTypes/User/UserDto";
import { useCallback } from "react";

type LoginRes = Awaited<ReturnType<typeof callLogin>>;

export function useAuth() {
  const setAuthAction = useAuthStore((s) => s.setAuth);
  const mergeUserAction = useAuthStore((s) => s.mergeUser);
  const currentAccessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const isAuthInitialized = useAuthStore((s) => s.authProviderInitialized);
  const currentRememberMe = useAuthStore((s) => s.rememberMe);

  const applyAuth = useCallback(
    async (r: AuthResult) => {
      const { accessToken, sessionId, persoId, wsMac, rememberMe } = r;

      setAuthAction(accessToken, sessionId, persoId, wsMac ?? null, rememberMe);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      try {
        const resp = await api.get<ApiEnvelope<UserDto>>("/api/users/me");
        const env = resp.data;
        if (env.isSuccess && env.data && !env.error) mergeUserAction(env.data);
      } catch {
        // keep calm; /me failure shouldn't brick auth
      }
    },
    [setAuthAction, mergeUserAction],
  );

  const login = useCallback(
    async (dto: UserLoginDto, rememberMe: boolean): Promise<LoginRes> => {
      const payload = {
        email: dto.email,
        password: dto.password,
        rememberMe,
        HumanToken: dto.HumanToken, // null is fine
      } as const;

      const res = await callLogin(payload);
      if (!res.success) return res;

      await applyAuth(res.data);
      return res;
    },
    [applyAuth],
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
    applyAuth, // <-- expose this for register flow
  };
}
