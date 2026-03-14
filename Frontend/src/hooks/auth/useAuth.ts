import type { AuthResult } from "@/api/auth.types.ts";
import { callLogin, callLogout } from "@/api/Auth/auth";
import { hydrateAuthenticatedState } from "@/api/Auth/hydrateAuth";
import { useAuthStore } from "@/stores/Auth/authStore";
import type { UserLoginDto } from "@myTypes/User/Auth/userLoginForm";
import { useCallback } from "react";

export function useAuth() {
  const currentAccessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const isAuthInitialized = useAuthStore((s) => s.authProviderInitialized);
  const currentRememberMe = useAuthStore((s) => s.rememberMe);

  const applyAuth = useCallback(async (r: AuthResult) => {
    await hydrateAuthenticatedState(r);
  }, []);

  const login = useCallback(
    async (dto: UserLoginDto, rememberMe: boolean) => {
      const auth = await callLogin({
        email: dto.email,
        password: dto.password,
        rememberMe,
        HumanToken: dto.HumanToken,
      });

      await applyAuth(auth);
      return auth;
    },
    [applyAuth],
  );

  const logout = useCallback(async (mode: "user" | "silent" = "user") => {
    await callLogout(mode);
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
