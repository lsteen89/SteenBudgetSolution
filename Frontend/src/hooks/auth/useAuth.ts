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
    async (_r: AuthResult) => {
      try {
        const resp = await api.get<ApiEnvelope<UserDto>>("/api/users/me");
        const env = resp.data;
        if (env.isSuccess && env.data && !env.error) mergeUserAction(env.data);
      } catch {
        /* ignore */
      }
    },
    [mergeUserAction],
  );

  const login = useCallback(
    async (dto: UserLoginDto, rememberMe: boolean): Promise<AuthResult> => {
      const payload = {
        email: dto.email,
        password: dto.password,
        rememberMe,
        HumanToken: dto.HumanToken, // null is fine
      } as const;

      const auth = await callLogin(payload); // AuthResult or throws ApiProblem
      // NOTE: callLogin currently already setsAuth() in the auth module.
      // applyAuth still makes sense because it fetches /me and merges user.
      await applyAuth(auth);

      return auth;
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
    applyAuth,
  };
}
